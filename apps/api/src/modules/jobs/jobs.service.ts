import { JD_ANALYSIS_QUEUE_NAME, JD_ANALYZER_JOB_NAME } from '@common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Job, User } from 'db';
import { ICreateJobDto, ICreateWorkerResponse, IUpdateJobStatusDto } from 'shared';
import { PrismaService } from 'src/infra/database/prisma.service';

import { IJdAnalysisWorker } from './types';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(JD_ANALYSIS_QUEUE_NAME) private readonly analysisQueue: Queue<IJdAnalysisWorker>,
  ) {}

  async create(body: ICreateJobDto, userId: User['id']): Promise<ICreateWorkerResponse> {
    const response = await this.prismaService.$transaction(async (prisma) => {
      const {
        id,
        analysisWorkers: [worker],
      } = await prisma.job.create({
        data: {
          jobDescription: body.jobDescription,
          resume: {
            connect: {
              id: body.resumeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
          analysisWorkers: {
            create: {},
          },
        },
        include: {
          analysisWorkers: true,
        },
      });

      this.logger.debug(
        `Created job with ID ${id} and analysis job ID ${worker.id} for user ${userId}`,
      );

      await this.analysisQueue.add(JD_ANALYZER_JOB_NAME, {
        analysisWorkerId: worker.id,
      });

      this.logger.debug(`Added analysis job with ID ${worker.id} to queue for job ID ${id}`);

      return {
        workerId: worker.id,
        status: worker.status,
      };
    });

    this.logger.log(
      `User ${userId} created unsaved job with analysis worker ID ${response.workerId}`,
    );

    return response;
  }

  async save(jobId: number, userId: User['id']): Promise<void> {
    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: { saved: true },
    });
  }

  async delete(jobId: number, userId: User['id']): Promise<void> {
    await this.prismaService.job.delete({
      where: { id: jobId, userId },
    });
  }

  async update(jobId: number, userId: User['id'], body: IUpdateJobStatusDto): Promise<void> {
    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: { status: body.status },
    });
  }

  async get(userId: User['id'], jobId: Job['id']) {
    return this.prismaService.job.findUnique({
      where: { id: jobId, userId },
      include: {
        resume: true,
        analysisWorkers: true,
      },
    });
  }

  async getAll(userId: User['id']) {
    return this.prismaService.job.findMany({
      where: { userId },
      include: {
        resume: {
          select: {
            name: true,
          },
        },
        analysisWorkers: {
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

  async reEvaluate(jobId: number, userId: User['id']): Promise<ICreateWorkerResponse> {
    const response = await this.prismaService.$transaction(async (prisma) => {
      const { id, status } = await prisma.analysisWorker.create({
        data: {
          job: {
            connect: {
              // todo: need to test if un-owned job can be connected?
              id: jobId,
              userId,
            },
          },
        },
      });

      await this.analysisQueue.add(JD_ANALYZER_JOB_NAME, {
        analysisWorkerId: id,
      });

      return {
        workerId: id,
        status,
      };
    });

    this.logger.log(`User ${userId} triggered re-evaluation for job - ${jobId}`);

    return response;
  }
}
