import { ANALYSER_QUEUE_NAME, RESUME_ANALYZER_JOB_NAME } from '@common/constants';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { AiRunStatus, Prisma, ResumeAnalysisError, ResumeAnalysisStatus } from 'db';
import {
  computeScore,
  flattenResume,
  IResumeJson,
  lintResume,
  llmFeedbackSchema,
  postProcessLlmFindings,
  RESUME_FEEDBACK_JSON_SCHEMA,
  RESUME_FEEDBACK_SCHEMA_NAME,
  ResumeAnalysisSnapshot,
} from 'shared';

import { AiFatalError, AiRetryableError } from '../../../infra/ai/ai.errors';
import { AiService } from '../../../infra/ai/ai.service';
import { PrismaService } from '../../../infra/database/prisma.service';
import { AiQuotaService } from './ai-quota.service';
import { RESUME_ANALYSIS_SYSTEM_PROMPT } from './resume-analysis.prompt';
import { IAnalyzerJobData } from './types';

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
    private readonly aiQuotaService: AiQuotaService,
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
    aiRunId,
  }: IAnalyzerJobData & { type: typeof RESUME_ANALYZER_JOB_NAME }) {
    if (typeof aiRunId !== 'number') {
      throw new AnalysisUnrecoverableError(
        `Job for resume ${resumeId} has no aiRunId`,
        ResumeAnalysisError.INTERNAL,
      );
    }

    const aiRun = await this.prismaService.aiRun.findUnique({ where: { id: aiRunId } });

    if (!aiRun) {
      throw new AnalysisUnrecoverableError(
        `No AiRun ${aiRunId} for resume ${resumeId}`,
        ResumeAnalysisError.INTERNAL,
      );
    }

    if (aiRun.status === AiRunStatus.SUCCEEDED) {
      this.logger.warn(`AiRun ${aiRunId} already succeeded, skipping duplicate job`);
      return;
    }

    if (aiRun.status !== AiRunStatus.RESERVED) {
      throw new AnalysisUnrecoverableError(
        `AiRun ${aiRunId} is ${aiRun.status}, not RESERVED`,
        ResumeAnalysisError.INTERNAL,
      );
    }

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
          analysisReport: Prisma.DbNull,
        },
      });

      const resumeJson = resume.json as unknown as IResumeJson;
      const { payload, idMap } = flattenResume(resumeJson, new Date());

      const { data, usage } = await this.aiService.generateJson({
        system: RESUME_ANALYSIS_SYSTEM_PROMPT,
        user: payload,
        schemaName: RESUME_FEEDBACK_SCHEMA_NAME,
        jsonSchema: RESUME_FEEDBACK_JSON_SCHEMA,
        zodSchema: llmFeedbackSchema,
      });

      const findings = [...postProcessLlmFindings(data, idMap), ...lintResume(resumeJson)];

      const snapshot: ResumeAnalysisSnapshot = {
        version: 1,
        score: computeScore(findings),
        resumeJsonUpdatedAt: resume.jsonUpdatedAt.toISOString(),
        analysedAt: new Date().toISOString(),
        idMap,
        findings,
      };

      await this.prismaService.$transaction(async (tx) => {
        await tx.resume.update({
          where: { id: resumeId },
          data: {
            analysisStatus: ResumeAnalysisStatus.DONE,
            analysisError: null,
            analysisReport: snapshot,
          },
        });

        await this.aiQuotaService.settleSucceeded(aiRunId, usage, tx);
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

    if (typeof job.data.aiRunId === 'number') {
      const generationId =
        error instanceof AiFatalError || error instanceof AiRetryableError
          ? error.generationId
          : undefined;

      try {
        await this.aiQuotaService.settleFailed(job.data.aiRunId, generationId);
      } catch (settleError) {
        this.logger.error(`Failed to settle AiRun ${job.data.aiRunId}: ${String(settleError)}`);
      }
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
