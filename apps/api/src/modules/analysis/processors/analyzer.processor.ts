import { ANALYSER_QUEUE_NAME, RESUME_ANALYZER_JOB_NAME } from '@common/constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { ReportGenerationStatus } from 'db';
import { z } from 'zod';

import { AiFatalError } from '../../../infra/ai/ai.errors';
import { AiService } from '../../../infra/ai/ai.service';
import { PrismaService } from '../../../infra/database/prisma.service';
import { IAnalyzerJobData } from '../../jobs/types';
import { getResumeAnalysisPrompt } from './template';

const MARKDOWN_SCHEMA_NAME = 'resume_markdown_report';
const MARKDOWN_JSON_SCHEMA = {
  type: 'object',
  properties: { markdown: { type: 'string' } },
  required: ['markdown'],
  additionalProperties: false,
};
const markdownSchema = z.object({ markdown: z.string().min(1) });
const MARKDOWN_SYSTEM_PROMPT =
  'Respond with a JSON object with a single field "markdown" that holds the full review as a markdown string.';
const MARKDOWN_MAX_TOKENS = 4000;

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
      this.logger.error(errorString);
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

      const { data } = await this.aiService.generateJson({
        system: MARKDOWN_SYSTEM_PROMPT,
        user: prompt,
        schemaName: MARKDOWN_SCHEMA_NAME,
        jsonSchema: MARKDOWN_JSON_SCHEMA,
        zodSchema: markdownSchema,
        maxTokens: MARKDOWN_MAX_TOKENS,
      });

      await this.prismaService.resume.update({
        where: { id: resumeId },
        data: {
          analysisReportGenerateStatus: ReportGenerationStatus.DONE,
          analysisReport: data.markdown,
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

      if (error instanceof AiFatalError) {
        throw new UnrecoverableError(error.message);
      }

      throw error;
    }
  }
}
