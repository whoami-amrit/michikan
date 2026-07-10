import { JD_ANALYSIS_QUEUE_NAME } from '@common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Job, User, WorkerStatus } from 'db';
import { ICreateJobDto, IUpdateJobDto } from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { IJdAnalysis } from './types';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(JD_ANALYSIS_QUEUE_NAME) private readonly analysisQueue: Queue<IJdAnalysis>,
  ) {}

  async create(body: ICreateJobDto, userId: User['id']): Promise<Job> {
    const job = await this.prismaService.job.create({
      data: {
        company: body.company,
        role: body.role,
        jobDescription: body.jobDescription,
        applyLink: body.applyLink,
        status: body.status,
        source: body.source,
        ...(body.shouldAnalyzeOptions.should
          ? {
              analyses: {
                create: {
                  status: WorkerStatus.PENDING,
                  resume: {
                    connect: {
                      id: body.shouldAnalyzeOptions.resumeId!,
                    },
                  },
                  user: {
                    connect: {
                      id: userId,
                    },
                  },
                },
              },
            }
          : {}),
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        analyses: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (body.shouldAnalyzeOptions.should) {
      this.logger.debug(`Job ${job.id} created with analysis, adding to queue`);

      await this.analysisQueue.add(JD_ANALYSIS_QUEUE_NAME, {
        analysisId: job.analyses[0].id,
        isCreatedFromJob: true,
      });
    }

    return job;
  }

  async delete(jobId: number, userId: User['id']): Promise<void> {
    await this.prismaService.job.delete({
      where: { id: jobId, userId },
    });
  }

  async update(jobId: number, userId: User['id'], body: IUpdateJobDto): Promise<void> {
    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: body,
    });
  }

  async get(userId: User['id'], jobId: Job['id']) {
    return this.prismaService.job.findUnique({
      where: { id: jobId, userId },
      include: {
        analyses: true,
      },
    });
  }

  async getAll(userId: User['id']) {
    return this.prismaService.job.findMany({
      where: { userId },
      include: {
        analyses: {
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
