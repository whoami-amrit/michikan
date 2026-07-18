import { ANALYSER_QUEUE_NAME, JOB_AT_A_GLANCE_JOB_NAME } from '@common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Job, JobStatus, User } from 'db';
import { ICreateJobDto, IUpdateJobDto } from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { IAnalyzerJobData } from './types';

@Injectable()
export class JobsService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(ANALYSER_QUEUE_NAME) private readonly analysisQueue: Queue<IAnalyzerJobData>,
  ) {}

  async create(body: ICreateJobDto, userId: User['id']): Promise<Job> {
    // todo: should I limit the number of jobs?
    const job = await this.prismaService.job.create({
      data: {
        company: body.company,
        role: body.role,
        jobDescription: body.jobDescription,
        applyLink: body.applyLink,
        status: body.status,
        source: body.source,
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        jobFitAnalyses: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    await this.analysisQueue.add(ANALYSER_QUEUE_NAME, {
      type: JOB_AT_A_GLANCE_JOB_NAME,
      jobId: job.id,
    });

    return job;
  }

  async delete(jobId: number, userId: User['id']): Promise<void> {
    await this.prismaService.job.delete({
      where: { id: jobId, userId },
    });
  }

  async update(jobId: number, userId: User['id'], body: IUpdateJobDto): Promise<void> {
    if (body.status === JobStatus.NOT_APPLIED) {
      body.submittedResumeId = null;
    }

    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: body,
    });
  }

  async get(userId: User['id'], jobId: Job['id']) {
    return this.prismaService.job.findUnique({
      where: { id: jobId, userId },
      include: {
        jobFitAnalyses: true,
      },
    });
  }

  async getAll(userId: User['id']) {
    return this.prismaService.job.findMany({
      where: { userId },
      include: {
        jobFitAnalyses: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      omit: {
        jobDescription: true,
      },
    });
  }
}
