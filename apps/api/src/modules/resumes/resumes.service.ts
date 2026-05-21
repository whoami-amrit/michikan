import { createHash } from 'node:crypto';

import { RENDER_PDF_JOB_NAME, RENDER_QUEUE_NAME } from '@common/constants';
import { ICreateJobResponse } from '@common/types/create-job.response';
import { IRenderPdfJobData } from '@common/types/render-pdf-job.interface';
import { IResumeJson } from '@common/types/resume.interface';
import { Resume } from '@db/client';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/infra/database/prisma.service';
import { S3Service } from 'src/infra/storage/s3.service';

import { CreateResumeRequestDto } from './dto/create-resume.dto';
import { UpdateResumeRequestDto } from './dto/update-resume.dto';
import { IRenderStatusResponse } from './responses/render-status.response';

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @InjectQueue(RENDER_QUEUE_NAME) private readonly renderQueue: Queue<IRenderPdfJobData>,
  ) {}

  async create(userId: number, createResumeDto: CreateResumeRequestDto): Promise<Resume> {
    const resume = await this.prisma.resume.create({
      data: {
        json: createResumeDto.json,
        name: createResumeDto.name,
        description: createResumeDto.description,
        userId,
      },
    });

    const currentActiveResume = await this.getActiveResume(userId);

    if (!currentActiveResume) {
      await this.setActiveResume(userId, resume.id);
    }

    return resume;
  }

  update(
    resumeId: number,
    userId: number,
    updateResumeDto: UpdateResumeRequestDto,
  ): Promise<Resume> {
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

  getAllForUser(userId: number): Promise<Resume[]> {
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

    const resumeRenderJob = await this.prisma.$transaction(async (prisma) => {
      const resumeRenderJob = await prisma.resumeRenderJob.create({
        data: {
          type: 'PDF',
          status: 'PENDING',
          sourceHash: createHash('sha256').update(JSON.stringify(resume.json)).digest('hex'),
          resumeId,
          userId,
        },
      });

      await this.renderQueue.add(RENDER_PDF_JOB_NAME, {
        jobId: resumeRenderJob.id,
        json: resume.json as IResumeJson,
      });

      return resumeRenderJob;
    });

    return {
      jobId: resumeRenderJob.id,
      status: resumeRenderJob.status,
    };
  }

  async getRenderStatus(jobId: number, userId: number): Promise<IRenderStatusResponse> {
    const renderJob = await this.prisma.resumeRenderJob.findUnique({
      where: { id: jobId, userId },
      include: { resume: true },
    });

    if (!renderJob) {
      throw new NotFoundException('Render job not found');
    }

    if (renderJob.status === 'FAILED') {
      throw new BadRequestException(`Render job failed: ${renderJob.error}`);
    }

    return {
      status: renderJob.status,
      downloadUrl: renderJob.storageKey
        ? await this.s3Service.getObjectSignedUrl(renderJob.storageKey, 'filename')
        : null,
    };
  }

  async setActiveResume(userId: number, resumeId: number) {
    // Upsert the active resume for the user
    await this.prisma.activeResume.upsert({
      where: { userId },
      update: { resumeId },
      create: {
        userId,
        resumeId,
      },
    });
  }

  async getActiveResume(userId: number) {
    const activeResume = await this.prisma.activeResume.findUnique({
      where: { userId },
      include: {
        resume: true, // Include the related resume data
      },
    });

    return activeResume?.resume ?? null; // Return the active resume or null if not set
  }
}
