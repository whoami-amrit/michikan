import {
  ANALYSER_QUEUE_NAME,
  JOB_AT_A_GLANCE_JOB_NAME,
  JOB_FIT_ANALYZER_JOB_NAME,
  RESUME_ANALYZER_JOB_NAME,
} from '@common/constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { error } from 'console';
import { AnalysisReportSchema, IAnalysisReport } from 'shared';

import { PrismaService } from '../../../infra/database/prisma.service';
import { IAnalyzerJobData } from '../../jobs/types';
import { AiService } from './ai.service';
import { getJobFitAnalyzerTemplate } from './template';

@Injectable()
@Processor(ANALYSER_QUEUE_NAME)
export class AnalyzerService extends WorkerHost {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  async process(job: Job<IAnalyzerJobData>) {
    const { data } = job;
    const { type: name } = data;

    switch (name) {
      case JOB_FIT_ANALYZER_JOB_NAME:
        await this.handleJobFitAnalysis(data);
        break;
      case RESUME_ANALYZER_JOB_NAME:
        this.handleResumeAnalysis(data);
        break;
      case JOB_AT_A_GLANCE_JOB_NAME:
        this.handleJobAtAGlance(data);
        break;
      default:
        this.logger.error('Received analysis job with unknown name: ' + (name as string));
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private handleJobAtAGlance(data: IAnalyzerJobData & { type: typeof JOB_AT_A_GLANCE_JOB_NAME }) {
    // todo: implement this method
    console.log(data);
  }

  private handleResumeAnalysis(data: IAnalyzerJobData & { type: typeof RESUME_ANALYZER_JOB_NAME }) {
    // todo: implement this method
    console.log(data);
  }

  private async handleJobFitAnalysis({
    analysisId,
    isCreatedFromJob,
  }: IAnalyzerJobData & { type: typeof JOB_FIT_ANALYZER_JOB_NAME }) {
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

    const prompt = getJobFitAnalyzerTemplate(
      jobDescription,
      JSON.stringify(analysisJob.resume.json, null, 2),
    );

    try {
      await this.prismaService.analysis.update({
        where: { id: analysisId },
        data: { status: 'IN_PROGRESS' },
      });

      const response = await this.aiService.execute<IAnalysisReport>(prompt, AnalysisReportSchema);

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
