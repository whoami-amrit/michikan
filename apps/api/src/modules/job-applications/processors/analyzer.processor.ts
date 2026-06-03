import { JD_ANALYSIS_QUEUE_NAME, JD_ANALYZER_JOB_NAME } from '@common/constants';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { error } from 'console';
import { readFileSync } from 'fs';
import type { TemplateDelegate } from 'handlebars';
import Handlebars from 'handlebars';
import path from 'path';
import { PrismaService } from 'src/infra/database/prisma.service';
import z from 'zod';

import { IJdAnalysisJob } from '../types';

export const RequirementMatchSchema = z.object({
  requirement: z.string(),
  status: z.enum(['MET', 'PARTIAL', 'MISSING']),
  evidence: z.string(), // direct quote from resume, or "none"
});

export const JdRequirementsSchema = z.object({
  required: z.array(z.string()),
  preferred: z.array(z.string()),
});

export const ResumeMatchOutputSchema = z.object({
  shouldApply: z.enum(['definitely', 'worth a try', 'no']),
  matchScore: z.number().int().min(0).max(100),
  jdRequirements: JdRequirementsSchema,
  requirementMatches: z.array(RequirementMatchSchema),
  strengths: z.array(z.string()).max(3),
  gaps: z.array(z.string()).max(3),
  summary: z.string(),
});

@Injectable()
@Processor(JD_ANALYSIS_QUEUE_NAME)
export class JobDescriptionAnalyzerProcessor extends WorkerHost {
  private readonly logger = new Logger(JobDescriptionAnalyzerProcessor.name);
  private readonly template: TemplateDelegate;

  constructor(
    private readonly googleGenAI: GoogleGenAI,
    private readonly prismaService: PrismaService,
  ) {
    super();

    try {
      const templateSource = readFileSync(
        path.join(process.cwd(), 'src', 'assets', 'jd-evaluation.template.hbs'),
        'utf-8',
      );
      this.template = Handlebars.compile(templateSource);
    } catch (error) {
      this.logger.error(
        'Failed to initialize jd match template',
        error instanceof Error ? error.stack : { error },
      );
      throw new UnrecoverableError('Failed to initialize jd match template');
    }
  }

  async process(job: Job<IJdAnalysisJob>) {
    const { name, data } = job;

    switch (name) {
      case JD_ANALYZER_JOB_NAME:
        await this.handleJDMatch(data);
        break;
      default:
        this.logger.warn('Received JD evaluation job with unknown name: ' + name);
        await this.prismaService.analysisJob.update({
          where: { id: data.analysisJobId },
          data: { status: 'FAILED', error: 'Unknown job name' },
        });
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async handleJDMatch({ analysisJobId }: IJdAnalysisJob) {
    const analysisJob = await this.prismaService.analysisJob.findUnique({
      where: { id: analysisJobId },
      include: {
        jobApplication: {
          include: {
            resume: true,
          },
        },
      },
    });

    if (!analysisJob) {
      const errorString = `Analysis job with ID ${analysisJobId} not found`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    if (!analysisJob.jobApplication.resume) {
      const errorString = `No associated resume for this analysis job ${analysisJobId}`;
      this.logger.error(errorString, error instanceof Error ? error.stack : undefined);
      throw new UnrecoverableError(errorString);
    }

    const prompt = this.template({
      jobDescription: analysisJob.jobApplication.jobDescription,
      resumeJson: JSON.stringify(analysisJob.jobApplication.resume.json),
    });

    try {
      await this.prismaService.analysisJob.update({
        where: { id: analysisJobId },
        data: { status: 'IN_PROGRESS' },
      });

      this.logger.debug({ prompt });

      const response = await this.googleGenAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: z.toJSONSchema(ResumeMatchOutputSchema),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM,
          },
        },
      });

      if (!response.text) {
        throw new Error('No response from Google GenAI');
      }

      await this.prismaService.analysisJob.update({
        where: { id: analysisJobId },
        data: {
          status: 'COMPLETED',
          analysis: ResumeMatchOutputSchema.parse(JSON.parse(response.text)),
        },
      });
    } catch (error) {
      this.logger.error('Failed to evaluate JD', error instanceof Error ? error.stack : { error });

      await this.prismaService.analysisJob.update({
        where: { id: analysisJobId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }
}
