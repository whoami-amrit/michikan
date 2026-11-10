import { ANALYSER_QUEUE_NAME, RESUME_ANALYZER_JOB_NAME } from '@common/constants';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { ResumeAnalysisError, ResumeAnalysisStatus } from 'db';
import { z } from 'zod';

import { AiFatalError, AiRetryableError } from '../../../infra/ai/ai.errors';
import { AiService } from '../../../infra/ai/ai.service';
import { PrismaService } from '../../../infra/database/prisma.service';
import { getResumeAnalysisPrompt } from './template';
import { IAnalyzerJobData } from './types';

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

class AnalysisUnrecoverableError extends UnrecoverableError {
  constructor(
    message: string,
    readonly analysisError: ResumeAnalysisError,
  ) {
    super(message);
    this.name = 'AnalysisUnrecoverableError';
  }
}

const toAnalysisError = (error: unknown): ResumeAnalysisError => {
  if (error instanceof AnalysisUnrecoverableError) {
    return error.analysisError;
  }

  if (
    (error instanceof AiFatalError || error instanceof AiRetryableError) &&
    (error.reason === 'provider' || error.reason === 'credits')
  ) {
    return ResumeAnalysisError.PROVIDER_UNAVAILABLE;
  }

  return ResumeAnalysisError.INTERNAL;
};

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
      throw new AnalysisUnrecoverableError(errorString, ResumeAnalysisError.INTERNAL);
    }

    try {
      await this.prismaService.resume.update({
        where: { id: resumeId },
        data: {
          analysisStatus: ResumeAnalysisStatus.GENERATING,
          analysisError: null,
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
          analysisStatus: ResumeAnalysisStatus.DONE,
          analysisError: null,
          analysisReport: data.markdown,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyse resume: ${String(error)}`,
        error instanceof Error ? error.stack : { error },
      );

      if (error instanceof AiFatalError) {
        throw new AnalysisUnrecoverableError(error.message, toAnalysisError(error));
      }

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<IAnalyzerJobData> | undefined, error: Error) {
    if (!job) {
      return;
    }

    const attempts = job.opts.attempts ?? 1;
    const isFinal = error instanceof UnrecoverableError || job.attemptsMade >= attempts;

    if (!isFinal) {
      return;
    }

    try {
      await this.prismaService.resume.updateMany({
        where: { id: job.data.resumeId },
        data: {
          analysisStatus: ResumeAnalysisStatus.FAILED,
          analysisError: toAnalysisError(error),
        },
      });
    } catch (updateError) {
      this.logger.error(
        `Failed to mark resume ${job.data.resumeId} as FAILED: ${String(updateError)}`,
      );
    }
  }
}
