import { Injectable } from '@nestjs/common';
import { Job, JobStatus, User } from 'db';
import { ICreateJobDto, IUpdateJobDto } from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class JobsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(body: ICreateJobDto, userId: User['id']): Promise<Job> {
    // todo: should I limit the number of jobs?
    return this.prismaService.job.create({
      data: {
        company: body.company,
        role: body.role,
        jobDescription: body.jobDescription,
        applyLink: body.applyLink,
        status: body.status,
        source: body.source,
        ...(body.submittedResumeId
          ? {
              submittedResume: {
                connect: {
                  id: body.submittedResumeId,
                },
              },
            }
          : {}),
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async delete(jobId: number, userId: User['id']): Promise<void> {
    await this.prismaService.job.delete({
      where: { id: jobId, userId },
    });
  }

  async update(jobId: number, userId: User['id'], body: IUpdateJobDto): Promise<void> {
    if (body.status === JobStatus.NOT_APPLIED) {
      body.submittedResumeId = null;
    }

    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: body,
    });
  }

  async get(userId: User['id'], jobId: Job['id']) {
    return this.prismaService.job.findUnique({
      where: { id: jobId, userId },
    });
  }

  async getAll(userId: User['id']) {
    return this.prismaService.job.findMany({
      where: { userId },
      omit: {
        jobDescription: true,
      },
    });
  }
}
