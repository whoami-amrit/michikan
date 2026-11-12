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

const findAiError = (error: unknown): AiFatalError | AiRetryableError | undefined => {
  if (error instanceof AiFatalError || error instanceof AiRetryableError) {
    return error;
  }

  if (error instanceof Error && error.cause) {
    return findAiError(error.cause);
  }

  return undefined;
};

const toAnalysisError = (error: unknown): ResumeAnalysisError => {
  const aiError = findAiError(error);

  if (aiError && (aiError.reason === 'provider' || aiError.reason === 'credits')) {
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
      throw new UnrecoverableError(`Job for resume ${resumeId} has no aiRunId`);
    }

    const aiRun = await this.prismaService.aiRun.findUnique({ where: { id: aiRunId } });

    if (!aiRun) {
      throw new UnrecoverableError(`No AiRun ${aiRunId} for resume ${resumeId}`);
    }

    if (aiRun.status === AiRunStatus.SUCCEEDED) {
      this.logger.warn(`AiRun ${aiRunId} already succeeded, skipping duplicate job`);
      return;
    }

    if (aiRun.status !== AiRunStatus.RESERVED) {
      throw new UnrecoverableError(`AiRun ${aiRunId} is ${aiRun.status}, not RESERVED`);
    }

    const resume = await this.prismaService.resume.findUnique({ where: { id: resumeId } });

    if (!resume) {
      const errorString = `No resume for this job id ${resumeId}`;
      this.logger.error(errorString);
      throw new UnrecoverableError(errorString);
    }

    try {
      const generating = await this.prismaService.resume.updateMany({
        where: { id: resumeId, analysisAiRunId: aiRunId },
        data: {
          analysisStatus: ResumeAnalysisStatus.GENERATING,
          analysisError: null,
          analysisReport: Prisma.DbNull,
        },
      });

      if (generating.count === 0) {
        throw new UnrecoverableError(
          `AiRun ${aiRunId} is not the current run of resume ${resumeId}`,
        );
      }

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
        const done = await tx.resume.updateMany({
          where: { id: resumeId, analysisAiRunId: aiRunId },
          data: {
            analysisStatus: ResumeAnalysisStatus.DONE,
            analysisError: null,
            analysisReport: snapshot,
          },
        });

        if (done.count === 0) {
          throw new UnrecoverableError(
            `AiRun ${aiRunId} is no longer the current run of resume ${resumeId}`,
          );
        }

        await this.aiQuotaService.settleSucceeded(aiRunId, usage, tx);
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyse resume: ${String(error)}`,
        error instanceof Error ? error.stack : { error },
      );

      if (error instanceof AiFatalError) {
        const unrecoverableError = new UnrecoverableError(error.message);
        unrecoverableError.cause = error;
        throw unrecoverableError;
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

    const { aiRunId, resumeId } = job.data;

    if (typeof aiRunId !== 'number') {
      return;
    }

    const generationId = findAiError(error)?.generationId;

    try {
      await this.aiQuotaService.settleFailed(aiRunId, generationId);
    } catch (settleError) {
      this.logger.error(`Failed to settle AiRun ${aiRunId}: ${String(settleError)}`);
    }

    try {
      await this.prismaService.resume.updateMany({
        where: { id: resumeId, analysisAiRunId: aiRunId },
        data: {
          analysisStatus: ResumeAnalysisStatus.FAILED,
          analysisError: toAnalysisError(error),
        },
      });
    } catch (updateError) {
      this.logger.error(`Failed to mark resume ${resumeId} as FAILED: ${String(updateError)}`);
    }
  }
}
