import {
  ANALYSER_QUEUE_NAME,
  RENDER_PDF_JOB_NAME,
  RENDER_QUEUE_NAME,
  RESUME_ANALYZER_JOB_NAME,
} from '@common/constants';
import appConfig, { type IAppConfig } from '@config/app.config';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Resume, ResumeAnalysisStatus } from 'db';
import {
  hashResumeJson,
  ICreateRenderWorkerResponse,
  ICreateResumeDto,
  IGetResumeResponse,
  IGetResumesResponse,
  IRenderStatusResponse,
  IUpdateResumeDto,
  resumeAnalysisSnapshotSchema,
} from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { S3Service } from '../../infra/storage/s3.service';
import { IAnalyzerJobData } from './analysis/types';
import { IRenderPdfWorker } from './types';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @InjectQueue(RENDER_QUEUE_NAME) private readonly renderQueue: Queue<IRenderPdfWorker>,
    @InjectQueue(ANALYSER_QUEUE_NAME) private readonly analyserQueue: Queue<IAnalyzerJobData>,
    @Inject(appConfig.KEY) private readonly config: IAppConfig,
  ) {}

  async create(userId: number, createResumeDto: ICreateResumeDto): Promise<Resume> {
    // todo: limit to 1 for free user?
    const resume = await this.prisma.resume.create({
      data: {
        json: createResumeDto.json,
        name: createResumeDto.name,
        description: createResumeDto.description,
        userId,
        analysisStatus: ResumeAnalysisStatus.QUEUED,
      },
    });

    await this.analyserQueue.add(ANALYSER_QUEUE_NAME, {
      type: RESUME_ANALYZER_JOB_NAME,
      resumeId: resume.id,
    });

    return resume;
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

    const jsonChanged =
      hashResumeJson(originalResume.json) !== hashResumeJson(updateResumeDto.json);

    const updatedResume = await this.prisma.resume.update({
      where: { id: resumeId, userId },
      data: {
        ...updateResumeDto,
        ...(jsonChanged && {
          analysisStatus: ResumeAnalysisStatus.QUEUED,
          analysisError: null,
        }),
      },
    });

    if (jsonChanged) {
      await this.analyserQueue.add(
        ANALYSER_QUEUE_NAME,
        {
          type: RESUME_ANALYZER_JOB_NAME,
          resumeId,
        },
        {
          deduplication: {
            id: String(resumeId),
            ttl: 5000,
            extend: true,
            replace: true,
          },
          delay: 5000,
          removeOnComplete: true,
        },
      );
    }

    return updatedResume;
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

    return { ...resume, analysisReport: snapshot.success ? snapshot.data : null };
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
        sourceHash: hashResumeJson(resume.json),
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

    const latestSourceHash = hashResumeJson(resume.json);

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
