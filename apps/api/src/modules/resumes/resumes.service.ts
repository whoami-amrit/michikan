import { isDeepStrictEqual } from 'node:util';

import {
  ANALYSER_QUEUE_NAME,
  RENDER_PDF_JOB_NAME,
  RENDER_QUEUE_NAME,
  RESUME_ANALYZER_JOB_NAME,
} from '@common/constants';
import appConfig, { type IAppConfig } from '@config/app.config';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { AiRunKind, AiRunStatus, Resume, ResumeAnalysisError, ResumeAnalysisStatus } from 'db';
import hash from 'object-hash';
import {
  ICreateRenderWorkerResponse,
  ICreateResumeDto,
  IGetResumeResponse,
  IGetResumesResponse,
  IQueueAnalysisResponse,
  IRenderStatusResponse,
  IUpdateResumeDto,
  resumeAnalysisSnapshotSchema,
} from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { S3Service } from '../../infra/storage/s3.service';
import { QuotaExceededError } from './analysis/ai-quota.errors';
import { AiQuotaService, RESERVATION_TTL_MS } from './analysis/ai-quota.service';
import { IAnalysisReservation, IAnalyzerJobData } from './analysis/types';
import { IRenderPdfWorker } from './types';

const AUTO_ANALYSE_DEBOUNCE_MS = 60_000;

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @InjectQueue(RENDER_QUEUE_NAME) private readonly renderQueue: Queue<IRenderPdfWorker>,
    @InjectQueue(ANALYSER_QUEUE_NAME) private readonly analyserQueue: Queue<IAnalyzerJobData>,
    @Inject(appConfig.KEY) private readonly config: IAppConfig,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  async create(userId: number, createResumeDto: ICreateResumeDto): Promise<Resume> {
    // todo: limit to 1 for free user?
    const resume = await this.prisma.resume.create({
      data: {
        json: createResumeDto.json,
        name: createResumeDto.name,
        description: createResumeDto.description,
        userId,
      },
    });

    await this.autoAnalyse(userId, resume);

    return this.prisma.resume.findUniqueOrThrow({ where: { id: resume.id } });
  }

  async update(
    resumeId: number,
    userId: number,
    updateResumeDto: IUpdateResumeDto,
  ): Promise<Resume> {
    const originalResume = await this.prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });

    if (!originalResume) {
      throw new NotFoundException('Resume not found');
    }

    const incomingJson: unknown = JSON.parse(JSON.stringify(updateResumeDto.json));
    const jsonChanged = !isDeepStrictEqual(originalResume.json, incomingJson);

    const updatedResume = await this.prisma.resume.update({
      where: { id: resumeId, userId },
      data: {
        ...updateResumeDto,
        ...(jsonChanged && { jsonUpdatedAt: new Date() }),
      },
    });

    if (!jsonChanged) {
      return updatedResume;
    }

    await this.autoAnalyse(userId, updatedResume);

    return this.prisma.resume.findUniqueOrThrow({ where: { id: resumeId } });
  }

  private async autoAnalyse(userId: number, resume: Resume): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoAnalyseResume: true },
    });

    if (!user?.autoAnalyseResume) {
      return;
    }

    const snapshot = resumeAnalysisSnapshotSchema.safeParse(resume.analysisReport);

    if (
      snapshot.success &&
      snapshot.data.resumeJsonUpdatedAt === resume.jsonUpdatedAt.toISOString()
    ) {
      return;
    }

    await this.reserveAndQueueAnalysis(userId, resume.id, {
      delay: AUTO_ANALYSE_DEBOUNCE_MS,
      deduplication: {
        id: String(resume.id),
        ttl: AUTO_ANALYSE_DEBOUNCE_MS,
        extend: true,
        replace: true,
      },
      removeOnComplete: true,
    });
  }

  private async reserveAndQueueAnalysis(
    userId: number,
    resumeId: number,
    jobOptions?: JobsOptions,
  ): Promise<void> {
    let reservation: IAnalysisReservation;

    try {
      reservation = await this.reserveAnalysisRun(userId, resumeId);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        await this.prisma.resume.update({
          where: { id: resumeId },
          data: {
            analysisStatus: ResumeAnalysisStatus.FAILED,
            analysisError: ResumeAnalysisError.QUOTA_EXCEEDED,
          },
        });
        return;
      }

      throw error;
    }

    await this.enqueueAnalysis(resumeId, reservation, jobOptions);
  }

  private reserveAnalysisRun(userId: number, resumeId: number): Promise<IAnalysisReservation> {
    return this.aiQuotaService.withUserLock(userId, async (tx) => {
      const resume = await tx.resume.findUnique({
        where: { id: resumeId, userId },
        select: { analysisAiRunId: true },
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      const currentRun =
        resume.analysisAiRunId === null
          ? null
          : await tx.aiRun.findUnique({ where: { id: resume.analysisAiRunId } });

      const isReusable =
        currentRun?.status === AiRunStatus.RESERVED &&
        Date.now() - currentRun.createdAt.getTime() < RESERVATION_TTL_MS;

      if (currentRun && isReusable) {
        await tx.resume.update({
          where: { id: resumeId },
          data: { analysisStatus: ResumeAnalysisStatus.QUEUED, analysisError: null },
        });

        return { aiRun: currentRun, reused: true };
      }

      if (currentRun?.status === AiRunStatus.RESERVED) {
        await this.aiQuotaService.settleFailed(currentRun.id, undefined, tx);
      }

      const aiRun = await this.aiQuotaService.reserve(userId, AiRunKind.RESUME_ANALYSIS, tx);

      await tx.resume.update({
        where: { id: resumeId },
        data: {
          analysisStatus: ResumeAnalysisStatus.QUEUED,
          analysisError: null,
          analysisAiRunId: aiRun.id,
        },
      });

      return { aiRun, reused: false };
    });
  }

  async requestAnalysis(userId: number, resumeId: number): Promise<IQueueAnalysisResponse> {
    const reservation = await this.reserveAnalysisRun(userId, resumeId);

    if (!reservation.reused) {
      await this.enqueueAnalysis(resumeId, reservation);
    }

    return { status: 'QUEUED', aiRunId: reservation.aiRun.id };
  }

  private async enqueueAnalysis(
    resumeId: number,
    reservation: IAnalysisReservation,
    jobOptions?: JobsOptions,
  ): Promise<void> {
    try {
      await this.analyserQueue.add(
        ANALYSER_QUEUE_NAME,
        { type: RESUME_ANALYZER_JOB_NAME, resumeId, aiRunId: reservation.aiRun.id },
        jobOptions,
      );
    } catch (error) {
      if (!reservation.reused) {
        await this.aiQuotaService.settleFailed(reservation.aiRun.id);
      }

      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          analysisStatus: ResumeAnalysisStatus.FAILED,
          analysisError: ResumeAnalysisError.INTERNAL,
        },
      });

      throw error;
    }
  }

  delete(resumeId: number, userId: number): Promise<Resume> {
    return this.prisma.resume.delete({
      where: { id: resumeId, userId },
    });
  }

  async get(userId: number, resumeId: number): Promise<IGetResumeResponse | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      return null;
    }

    const snapshot = resumeAnalysisSnapshotSchema.safeParse(resume.analysisReport);
    const analysisReport = snapshot.success ? snapshot.data : null;
    const isAnalysisStale =
      resume.analysisStatus === ResumeAnalysisStatus.DONE &&
      analysisReport !== null &&
      analysisReport.resumeJsonUpdatedAt !== resume.jsonUpdatedAt.toISOString();

    return { ...resume, analysisReport, isAnalysisStale };
  }

  getAll(userId: number): Promise<IGetResumesResponse[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: {
        jobs: { select: { id: true } },
      },
      omit: {
        json: true,
      },
    });
  }

  async renderPdf(resumeId: number, userId: number): Promise<ICreateRenderWorkerResponse> {
    // todo: limit to 5 per week
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const previousSuccessJob = await this.checkPreviousSuccessRenderJob(resume, userId);

    if (previousSuccessJob) {
      this.logger.debug(
        `Found a previous success download! Re-serving this render: ${resumeId} of ${userId}`,
      );

      return {
        workerId: previousSuccessJob.id,
        status: previousSuccessJob.status,
        downloadUrl: await this.s3Service.getObjectSignedUrl(
          previousSuccessJob.storageKey!,
          'filename',
        ),
      };
    }

    const resumeRenderJob = await this.prisma.resumeRenderWorker.create({
      data: {
        sourceHash: hash(resume.json),
        resumeId,
        userId,
      },
    });

    await this.renderQueue.add(RENDER_PDF_JOB_NAME, {
      workerId: resumeRenderJob.id,
    });

    return {
      workerId: resumeRenderJob.id,
      status: resumeRenderJob.status,
    };
  }

  private async checkPreviousSuccessRenderJob(resume: Resume, userId: number) {
    if (this.config.env === 'development') {
      this.logger.debug('Skipping check for previous successful render job in development mode');
      return null;
    }

    const latestSourceHash = hash(resume.json);

    const previousJob = await this.prisma.resumeRenderWorker.findFirst({
      where: {
        resumeId: resume.id,
        userId,
        status: 'COMPLETED',
      },
    });

    return previousJob?.sourceHash === latestSourceHash && previousJob.storageKey
      ? previousJob
      : null;
  }

  async getRenderStatus(workerId: number, userId: number): Promise<IRenderStatusResponse> {
    const renderJob = await this.prisma.resumeRenderWorker.findUnique({
      where: { id: workerId, userId },
    });

    if (!renderJob) {
      throw new NotFoundException('Render job not found');
    }

    return {
      ...renderJob,
      ...(renderJob.status === 'COMPLETED' && renderJob.storageKey
        ? { downloadUrl: await this.s3Service.getObjectSignedUrl(renderJob.storageKey, 'filename') }
        : {}),
    };
  }
}
