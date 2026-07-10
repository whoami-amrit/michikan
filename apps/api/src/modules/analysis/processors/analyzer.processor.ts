import { JD_ANALYSIS_QUEUE_NAME, JD_ANALYZER_JOB_NAME } from '@common/constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { error } from 'console';
import { AnalysisReportSchema, IAnalysisReport } from 'shared';

import { PrismaService } from '../../../infra/database/prisma.service';
import { IJdAnalysis } from '../../jobs/types';
import { AiService } from './ai.service';
import { getPrompt } from './template';

@Injectable()
@Processor(JD_ANALYSIS_QUEUE_NAME)
export class AnalyzerService extends WorkerHost {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  async process(job: Job<IJdAnalysis>) {
    const { name, data } = job;

    switch (name) {
      case JD_ANALYZER_JOB_NAME:
        await this.handleJDMatch(data);
        break;
      default:
        this.logger.warn('Received JD evaluation job with unknown name: ' + name);
        await this.prismaService.analysis.update({
          where: { id: data.analysisId },
          data: { status: 'FAILED' },
        });
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async handleJDMatch({ analysisId, isCreatedFromJob }: IJdAnalysis) {
    const analysisJob = await this.prismaService.analysis.findUnique({
      where: { id: analysisId },
      include: {
        resume: true,
        user: true,
        ...(isCreatedFromJob
          ? {
            job: {
              select: {
                jobDescription: true,
              },
            },
          }
          : {}),
      },
    });

    if (!analysisJob) {
      const errorString = `Analysis job with ID ${analysisId} not found`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    if (!analysisJob.resume) {
      const errorString = `No associated resume for this analysis job ${analysisId}`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    const jobDescription = isCreatedFromJob
      ? analysisJob.job!.jobDescription
      : analysisJob.jobDescription!;

    const prompt = getPrompt(jobDescription, {
      yearsOfExperience: analysisJob.user.yearsOfExperience,
      preferredWorkSetting: analysisJob.user.preferredWorkSetting,
      salaryExpectation: analysisJob.user.salaryExpectation,
      resume: analysisJob.resume.json,
    });

    try {
      await this.prismaService.analysis.update({
        where: { id: analysisId },
        data: { status: 'IN_PROGRESS' },
      });

      const response = await this.aiService.execute<IAnalysisReport>(
        prompt,
        AnalysisReportSchema,
      );


      if (response === null) {
        await this.prismaService.analysis.update({
          where: { id: analysisId },
          data: {
            status: 'FAILED',
            title: `Analysis against ${analysisJob.resume.name}`,
          },
        });

        return;
      }

      await this.prismaService.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          report: response,
          title: `${response.jobTitle} at ${response.companyName}`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to evaluate JD', error instanceof Error ? error.stack : { error });

      await this.prismaService.analysis.update({
        where: { id: analysisId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }
}
