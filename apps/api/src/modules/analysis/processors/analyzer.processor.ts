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
import { ReportGenerationStatus } from 'db';

import { PrismaService } from '../../../infra/database/prisma.service';
import { IAnalyzerJobData } from '../../jobs/types';
import { AiService } from './ai.service';
import {
  getJobAtAGlancePrompt,
  getJobFitAnalyzerTemplate,
  getResumeAnalysisPrompt,
} from './template';

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
        await this.handleResumeAnalysis(data);
        break;
      case JOB_AT_A_GLANCE_JOB_NAME:
        await this.handleJobAtAGlance(data);
        break;
      default:
        this.logger.error('Received analysis job with unknown name: ' + (name as string));
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async handleJobAtAGlance({
    jobId,
  }: IAnalyzerJobData & { type: typeof JOB_AT_A_GLANCE_JOB_NAME }) {
    const job = await this.prismaService.job.findUnique({ where: { id: jobId } });

    if (!job) {
      const errorString = `No job for this job id ${jobId}`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    const prompt = getJobAtAGlancePrompt(job.jobDescription);

    try {
      const response = await this.aiService.execute(prompt);

      await this.prismaService.job.update({
        where: { id: jobId },
        data: {
          atAGlanceGenerateStatus: ReportGenerationStatus.DONE,
          atAGlance: response,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate at a glance for Job: ${String(error)}`,
        error instanceof Error ? error.stack : { error },
      );

      await this.prismaService.job.update({
        where: { id: jobId },
        data: {
          atAGlanceGenerateStatus: ReportGenerationStatus.FAILED,
        },
      });

      throw error;
    }
  }

  private async handleResumeAnalysis({
    resumeId,
  }: IAnalyzerJobData & { type: typeof RESUME_ANALYZER_JOB_NAME }) {
    const resume = await this.prismaService.resume.findUnique({ where: { id: resumeId } });

    if (!resume) {
      const errorString = `No resume for this job id ${resumeId}`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    const prompt = getResumeAnalysisPrompt(JSON.stringify(resume, null, 2));

    try {
      const response = await this.aiService.execute(prompt);

      await this.prismaService.resume.update({
        where: { id: resumeId },
        data: {
          analysisReportGenerateStatus: ReportGenerationStatus.DONE,
          analysisReport: response,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyse resume: ${String(error)}`,
        error instanceof Error ? error.stack : { error },
      );

      await this.prismaService.resume.update({
        where: { id: resumeId },
        data: {
          analysisReportGenerateStatus: ReportGenerationStatus.FAILED,
        },
      });

      throw error;
    }
  }

  private async handleJobFitAnalysis({
    analysisId,
    isCreatedFromJob,
  }: IAnalyzerJobData & { type: typeof JOB_FIT_ANALYZER_JOB_NAME }) {
    const analysisJob = await this.prismaService.jobFitAnalysis.findUnique({
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
      const response = await this.aiService.execute(prompt);

      await this.prismaService.jobFitAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          report: response,
          title: `Job fit analysis ${analysisJob.createdAt.toLocaleDateString()} [r/${analysisJob.resume.name}]`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to evaluate JD', error instanceof Error ? error.stack : { error });

      await this.prismaService.jobFitAnalysis.update({
        where: { id: analysisId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }
}
