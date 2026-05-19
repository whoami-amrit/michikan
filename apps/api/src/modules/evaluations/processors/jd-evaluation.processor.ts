import { JD_EVALUATION_JOB_NAME, JD_EVALUATION_QUEUE_NAME } from '@common/constants';
import { IJdEvaluationJobData } from '@common/types/jd-evaluation-job.interface';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { readFileSync } from 'fs';
import type { TemplateDelegate } from 'handlebars';
import Handlebars from 'handlebars';
import path from 'path';
import { PrismaService } from 'src/infra/database/prisma.service';
import z from 'zod';

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
@Processor(JD_EVALUATION_QUEUE_NAME)
export class JdEvaluationProcessor extends WorkerHost {
  private readonly template: TemplateDelegate;

  constructor(
    private readonly googleGenAI: GoogleGenAI,
    private readonly prismaService: PrismaService,
  ) {
    super();
    try {
      const templateSource = readFileSync(
        path.join(__dirname, 'jd-evaluation.template.hbs'),
        'utf-8',
      );
      this.template = Handlebars.compile(templateSource);
    } catch (error) {
      console.error(error);
      throw new UnrecoverableError('Failed to initialize jd match template');
    }
  }

  async process(job: Job<IJdEvaluationJobData>) {
    const { name, data } = job;

    switch (name) {
      case JD_EVALUATION_JOB_NAME:
        await this.handleJDMatch(data);
        break;
      default:
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async handleJDMatch({ jobDescription, resumeJson, jobId }: IJdEvaluationJobData) {
    const prompt = this.template({
      jobDescription,
      resumeJson: JSON.stringify(resumeJson),
    });

    try {
      await this.prismaService.jDMatchJob.update({
        where: { id: jobId },
        data: { status: 'IN_PROGRESS' },
      });

      console.log(prompt);

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

      await this.prismaService.jDMatchJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          responseJson: ResumeMatchOutputSchema.parse(JSON.parse(response.text)),
        },
      });
    } catch (error) {
      console.error(error);
      await this.prismaService.jDMatchJob.update({
        where: { id: jobId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }
}
