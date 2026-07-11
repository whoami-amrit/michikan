import { ANALYSER_QUEUE_NAME, JOB_FIT_ANALYZER_JOB_NAME } from '@common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { User, WorkerStatus } from 'db';
import { ICreateAnalysisDto } from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';
import { IAnalyzerJobData } from '../jobs/types';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(ANALYSER_QUEUE_NAME) private readonly analysisQueue: Queue<IAnalyzerJobData>,
  ) {}

  async create(data: ICreateAnalysisDto, userId: User['id']) {
    const analysis = await this.prismaService.analysis.create({
      data: {
        status: WorkerStatus.PENDING,
        jobDescription: data.jobDescription,
        resume: {
          connect: {
            id: data.resumeId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    await this.analysisQueue.add(JOB_FIT_ANALYZER_JOB_NAME, {
      type: JOB_FIT_ANALYZER_JOB_NAME,
      analysisId: analysis.id,
      isCreatedFromJob: false,
    });

    return analysis;
  }

  async getAll(userId: User['id']) {
    return this.prismaService.analysis.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  async get(userId: User['id'], analysisId: number) {
    return this.prismaService.analysis.findUnique({
      where: {
        id: analysisId,
        userId,
      },
    });
  }
}
