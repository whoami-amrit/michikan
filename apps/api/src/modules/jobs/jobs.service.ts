import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, Prisma, User } from 'db';
import { ICreateJobDto, IListJobsQueryDto, IUpdateJobDto } from 'shared';

import { PrismaService } from '@/infra/database/prisma.service';

const DEFAULT_JOBS_QUERY: IListJobsQueryDto = {
  sortBy: 'updatedAt',
  order: 'desc',
};

@Injectable()
export class JobsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(body: ICreateJobDto, userId: User['id']): Promise<Job> {
    // todo: should I limit the number of jobs?
    const submittedResumeId =
      body.status !== JobStatus.NOT_APPLIED ? body.submittedResumeId : undefined;

    return this.prismaService.job.create({
      data: {
        company: body.company,
        role: body.role,
        jobDescription: body.jobDescription,
        applyLink: body.applyLink,
        status: body.status,
        source: body.source,
        ...(submittedResumeId !== undefined && submittedResumeId !== null
          ? {
              submittedResume: {
                connect: {
                  id: submittedResumeId,
                },
              },
              submittedResumeLinkedAt: new Date(),
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
    const existingJob = await this.prismaService.job.findUnique({
      where: { id: jobId, userId },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found');
    }

    const nextSubmittedResumeId =
      body.status === JobStatus.NOT_APPLIED ? null : body.submittedResumeId;
    const submittedResumeChanged =
      nextSubmittedResumeId !== undefined &&
      nextSubmittedResumeId !== existingJob.submittedResumeId;

    await this.prismaService.job.update({
      where: { id: jobId, userId },
      data: {
        ...body,
        ...(body.status === JobStatus.NOT_APPLIED ? { submittedResumeId: null } : {}),
        ...(submittedResumeChanged
          ? { submittedResumeLinkedAt: nextSubmittedResumeId !== null ? new Date() : null }
          : {}),
      },
    });
  }

  async get(userId: User['id'], jobId: Job['id']) {
    return this.prismaService.job.findUnique({
      where: { id: jobId, userId },
    });
  }

  async getAll(userId: User['id'], query: IListJobsQueryDto = DEFAULT_JOBS_QUERY) {
    return this.prismaService.job.findMany({
      where: { userId },
      orderBy: this.buildOrderBy(query),
      omit: {
        jobDescription: true,
      },
    });
  }

  private buildOrderBy(query: IListJobsQueryDto): Prisma.JobOrderByWithRelationInput[] {
    const { sortBy, order } = query;

    switch (sortBy) {
      case 'name':
        return [{ role: order }, { company: order }, { id: 'desc' }];
      case 'status':
        return [{ status: order }, { id: 'desc' }];
      case 'updatedAt':
        return [{ updatedAt: order }, { id: 'desc' }];
    }
  }
}
