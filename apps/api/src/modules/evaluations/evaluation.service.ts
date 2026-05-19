import { JD_EVALUATION_QUEUE_NAME } from '@common/constants';
import { ICreateJobResponse } from '@common/types/create-job.response';
import { IJdEvaluationJobData } from '@common/types/jd-evaluation-job.interface';
import { IResumeJson } from '@common/types/resume.interface';
import { JDMatchJob } from '@db/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/infra/database/prisma.service';

import { ResumeService } from '../resumes/resumes.service';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly resumeService: ResumeService,
    @InjectQueue(JD_EVALUATION_QUEUE_NAME)
    private readonly jdMatchQueue: Queue<IJdEvaluationJobData>,
  ) {}

  async createJDMatchJob(userId: number, jd: string): Promise<ICreateJobResponse> {
    const activeResume = await this.resumeService.getActiveResume(userId);

    if (!activeResume) {
      throw new InternalServerErrorException('No active resume found for user');
    }

    const jdMatchJob = await this.prismaService.$transaction(async (prisma) => {
      const jobRecord = await prisma.jDMatchJob.create({
        data: {
          userId,
          resumeId: activeResume.id,
          status: 'PENDING',
        },
      });

      await this.jdMatchQueue.add('jd-match', {
        jobDescription: jd,
        jobId: jobRecord.id,
        resumeJson: activeResume.json as IResumeJson,
      });
      return jobRecord;
    });

    return {
      jobId: jdMatchJob.id,
      status: jdMatchJob.status,
    };
  }

  async getJDMatchJobStatus(
    userId: number,
    jobId: number,
  ): Promise<Pick<JDMatchJob, 'responseJson' | 'status'>> {
    const jobRecord = await this.prismaService.jDMatchJob.findUnique({
      where: { id: jobId, userId },
    });

    if (!jobRecord) {
      throw new NotFoundException('Job not found');
    }

    return {
      status: jobRecord.status,
      responseJson: jobRecord.responseJson,
    };
  }
}
