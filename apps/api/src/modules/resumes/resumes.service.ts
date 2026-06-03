import { createHash } from 'node:crypto';

import { RENDER_PDF_JOB_NAME, RENDER_QUEUE_NAME } from '@common/constants';
import { ICreateJobResponse } from '@common/types/create-job.response';
import { Resume } from '@db/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/infra/database/prisma.service';
import { S3Service } from 'src/infra/storage/s3.service';

import { CreateResumeDto } from './dto/create.dto';
import { UpdateResumeDto } from './dto/update.dto';
import { IRenderStatusResponse } from './responses/render-status.response';
import { IRenderPdfJob } from './types';

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @InjectQueue(RENDER_QUEUE_NAME) private readonly renderQueue: Queue<IRenderPdfJob>,
  ) {}

  create(userId: number, createResumeDto: CreateResumeDto): Promise<Resume> {
    return this.prisma.resume.create({
      data: {
        json: createResumeDto.json,
        name: createResumeDto.name,
        description: createResumeDto.description,
        userId,
      },
    });
  }

  update(resumeId: number, userId: number, updateResumeDto: UpdateResumeDto): Promise<Resume> {
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

  get(userId: number, resumeId?: number) {
    if (resumeId) {
      return this.prisma.resume.findUnique({
        where: { id: resumeId, userId },
      });
    }

    return this.prisma.resume.findMany({
      where: { userId },
    });
  }

  async renderPdf(resumeId: number, userId: number): Promise<ICreateJobResponse> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const previousSuccessJob = await this.checkPreviousSuccessRenderJob(resume, userId);

    if (previousSuccessJob) {
      return {
        jobId: previousSuccessJob.id,
        status: previousSuccessJob.status,
      };
    }

    const resumeRenderJob = await this.prisma.$transaction(async (prisma) => {
      const resumeRenderJob = await prisma.resumeRenderJob.create({
        data: {
          status: 'PENDING',
          sourceHash: this.createHashOfResumeJson(resume),
          resumeId,
          userId,
        },
      });

      await this.renderQueue.add(RENDER_PDF_JOB_NAME, {
        jobId: resumeRenderJob.id,
      });

      return resumeRenderJob;
    });

    return {
      jobId: resumeRenderJob.id,
      status: resumeRenderJob.status,
    };
  }

  private createHashOfResumeJson(resume: Resume): string {
    return createHash('sha256').update(JSON.stringify(resume.json)).digest('hex');
  }

  private async checkPreviousSuccessRenderJob(resume: Resume, userId: number) {
    const latestSourceHash = this.createHashOfResumeJson(resume);

    const previousJob = await this.prisma.resumeRenderJob.findFirst({
      where: {
        resumeId: resume.id,
        userId,
        status: 'COMPLETED',
      },
    });

    return previousJob?.sourceHash === latestSourceHash ? previousJob : null;
  }

  async getRenderStatus(jobId: number, userId: number): Promise<IRenderStatusResponse> {
    const renderJob = await this.prisma.resumeRenderJob.findUnique({
      where: { id: jobId, userId },
      include: { resume: true },
    });

    if (!renderJob) {
      throw new NotFoundException('Render job not found');
    }

    const response: IRenderStatusResponse = {
      status: renderJob.status,
    };

    if (renderJob.status === 'FAILED' && renderJob.error) {
      response.error = renderJob.error;
    }

    if (renderJob.status === 'COMPLETED' && renderJob.storageKey) {
      response.downloadUrl = await this.s3Service.getObjectSignedUrl(
        renderJob.storageKey,
        'filename',
      );
    }

    return response;
  }
}
