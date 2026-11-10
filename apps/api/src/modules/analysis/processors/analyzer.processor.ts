import { ANALYSER_QUEUE_NAME, RESUME_ANALYZER_JOB_NAME } from '@common/constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { error } from 'console';
import { ReportGenerationStatus } from 'db';

import { PrismaService } from '../../../infra/database/prisma.service';
import { IAnalyzerJobData } from '../../jobs/types';
import { AiService } from './ai.service';
import { getResumeAnalysisPrompt } from './template';

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
      case RESUME_ANALYZER_JOB_NAME:
        await this.handleResumeAnalysis(data);
        break;
      default:
        this.logger.error('Received analysis job with unknown name: ' + (name as string));
        throw new UnrecoverableError('Unknown job name');
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

    try {
      await this.prismaService.resume.update({
        where: { id: resumeId },
        data: {
          analysisReportGenerateStatus: ReportGenerationStatus.GENERATING,
          analysisReport: null,
        },
      });

      const prompt = getResumeAnalysisPrompt(JSON.stringify(resume.json, null, 2));

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
}
