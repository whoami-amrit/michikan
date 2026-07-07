import { JD_ANALYSIS_QUEUE_NAME, JD_ANALYZER_JOB_NAME } from '@common/constants';
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

import { IJdAnalysis } from '../types';
import { AiService } from './ai.service';

export const ResumeMatchOutputSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  workSetting: z.enum(['REMOTE', 'ONSITE', 'HYBRID', 'UNKNOWN']),
  experienceLevel: z.enum(['JUNIOR', 'MID', 'SENIOR', 'STAFF_PLUS', 'UNKNOWN']),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string().nullable(),
  salaryPeriod: z.enum(['YEARLY', 'MONTHLY', 'HOURLY', 'UNKNOWN']),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  stackSkills: z.array(z.string()),
  matchedRequiredSkills: z.array(z.string()),
  missingRequiredSkills: z.array(z.string()),
  matchedPreferredSkills: z.array(z.string()),
  missingPreferredSkills: z.array(z.string()),
  matchedStackSkills: z.array(z.string()),
  candidateExperienceLevel: z.enum(['JUNIOR', 'MID', 'SENIOR', 'STAFF_PLUS']),
  matchScore: z.number().int().min(0).max(100).nullable(),
  summary: z.string().nonempty(),
});

type IResumeMatchOutput = z.infer<typeof ResumeMatchOutputSchema>;

@Injectable()
@Processor(JD_ANALYSIS_QUEUE_NAME)
export class AnalyzerService extends WorkerHost {
  private readonly logger = new Logger(AnalyzerService.name);
  private readonly template: TemplateDelegate;

  constructor(
    private readonly aiService: AiService,
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
          data: { status: 'FAILED', error: 'Unknown job name' },
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
      : analysisJob.jobDescription;

    const prompt = this.template({
      jobDescription,
      candidateInfo: {
        yearsOfExperience: analysisJob.user.yearsOfExperience,
        preferredWorkSetting: analysisJob.user.preferredWorkSetting,
        salaryExpectation: analysisJob.user.salaryExpectation,
        resume: analysisJob.resume.json,
      },
    });

    try {
      await this.prismaService.analysis.update({
        where: { id: analysisId },
        data: { status: 'IN_PROGRESS' },
      });

      const response = await this.aiService.execute<IResumeMatchOutput>(
        prompt,
        ResumeMatchOutputSchema,
      );

      if (response === null) {
        await this.prismaService.analysis.update({
          where: { id: analysisId },
          data: {
            status: 'FAILED',
            error: 'Failed to get response from Gemini API or parse the response',
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
