import { JD_ANALYSIS_QUEUE_NAME, JD_ANALYZER_JOB_NAME } from '@common/constants';
import { ICreateJobResponse } from '@common/types/create-job.response';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobApplication, User } from 'db';
import { ICreateJobApplicationDto, IUpdateJobApplicationStatusDto } from 'shared';
import { PrismaService } from 'src/infra/database/prisma.service';

import { IJdAnalysisJob } from './types';

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(JD_ANALYSIS_QUEUE_NAME) private readonly analysisQueue: Queue<IJdAnalysisJob>,
  ) {}

  async create(body: ICreateJobApplicationDto, userId: User['id']): Promise<ICreateJobResponse> {
    const response = await this.prismaService.$transaction(async (prisma) => {
      const {
        id,
        analysisJobs: [job],
      } = await prisma.jobApplication.create({
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
          analysisJobs: {
            create: {},
          },
        },
        include: {
          analysisJobs: true,
        },
      });

      this.logger.debug(
        `Created job application with ID ${id} and analysis job ID ${job.id} for user ${userId}`,
      );

      await this.analysisQueue.add(JD_ANALYZER_JOB_NAME, {
        analysisJobId: job.id,
      });

      this.logger.debug(
        `Added analysis job with ID ${job.id} to queue for job application ID ${id}`,
      );

      return {
        jobId: job.id,
        status: job.status,
      };
    });

    this.logger.log(
      `User ${userId} created unsaved job application with analysis job ID ${response.jobId}`,
    );

    return response;
  }

  async save(jobApplicationId: number, userId: User['id']): Promise<void> {
    await this.prismaService.jobApplication.update({
      where: { id: jobApplicationId, userId },
      data: { saved: true },
    });
  }

  async delete(jobApplicationId: number, userId: User['id']): Promise<void> {
    await this.prismaService.jobApplication.delete({
      where: { id: jobApplicationId, userId },
    });
  }

  async update(
    jobApplicationId: number,
    userId: User['id'],
    body: IUpdateJobApplicationStatusDto,
  ): Promise<void> {
    await this.prismaService.jobApplication.update({
      where: { id: jobApplicationId, userId },
      data: { status: body.status },
    });
  }

  async get(userId: User['id'], jobApplicationId?: JobApplication['id']) {
    const baseInclude = {
      resume: true,
      analysisJobs: true,
    };

    if (jobApplicationId) {
      return this.prismaService.jobApplication.findUnique({
        where: { id: jobApplicationId, userId },
        include: baseInclude,
      });
    }

    return this.prismaService.jobApplication.findMany({
      where: { userId },
      include: baseInclude,
    });
  }

  async reEvaluate(jobApplicationId: number, userId: User['id']): Promise<ICreateJobResponse> {
    const response = await this.prismaService.$transaction(async (prisma) => {
      const { id, status } = await prisma.analysisJob.create({
        data: {
          jobApplication: {
            connect: {
              // todo: need to test if un-owned job application can be connected?
              id: jobApplicationId,
              userId,
            },
          },
        },
      });

      await this.analysisQueue.add(JD_ANALYZER_JOB_NAME, {
        analysisJobId: id,
      });

      return {
        jobId: id,
        status,
      };
    });

    this.logger.log(
      `User ${userId} triggered re-evaluation for job application - ${jobApplicationId}`,
    );

    return response;
  }
}
