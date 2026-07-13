import { createHash } from 'node:crypto';

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
import { Resume } from 'db';
import {
  ICreateRenderWorkerResponse,
  ICreateResumeDto,
  IGetResumesResponse,
  IRenderStatusResponse,
  IUpdateResumeDto,
} from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { S3Service } from '../../infra/storage/s3.service';
import { IAnalyzerJobData } from '../jobs/types';
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
      },
    });

    await this.analyserQueue.add(ANALYSER_QUEUE_NAME, {
      type: RESUME_ANALYZER_JOB_NAME,
      resumeId: resume.id,
    });

    return resume;
  }

  update(resumeId: number, userId: number, updateResumeDto: IUpdateResumeDto): Promise<Resume> {
    return this.prisma.resume.update({
      where: { id: resumeId, userId },
      data: updateResumeDto,
    });
  }

  delete(resumeId: number, userId: number): Promise<Resume> {
    return this.prisma.resume.delete({
      where: { id: resumeId, userId },
    });
  }

  get(userId: number, resumeId: number): Promise<Resume | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });
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
        sourceHash: this.createHashOfResumeJson(resume),
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

  private createHashOfResumeJson(resume: Resume): string {
    return createHash('sha256').update(JSON.stringify(resume.json)).digest('hex');
  }

  private async checkPreviousSuccessRenderJob(resume: Resume, userId: number) {
    if (this.config.env === 'development') {
      this.logger.debug('Skipping check for previous successful render job in development mode');
      return null;
    }

    const latestSourceHash = this.createHashOfResumeJson(resume);

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
