import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type AiRun, AiRunKind, AiRunStatus, Plan, Prisma, ResumeAnalysisStatus } from 'db';
import { IAiUsageResponse } from 'shared';

import type { AiUsage } from '../../../infra/ai/ai.service';
import { PrismaService } from '../../../infra/database/prisma.service';
import { getEffectivePlan } from '../../users/plan';
import { QuotaExceededError } from './ai-quota.errors';

export const FREE_RUN_LIMIT = 10;
export const PRO_DAILY_RUN_LIMIT = 100;
export const RESERVATION_TTL_MS = 15 * 60 * 1000;

type Db = PrismaService | Prisma.TransactionClient;

const serialiseReservationsOfUser = (tx: Prisma.TransactionClient, userId: number) =>
  tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

const startOfUtcDay = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const nextUtcMidnight = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

const quotaFor = (plan: Plan, now: Date) =>
  plan === Plan.PRO
    ? {
        limit: PRO_DAILY_RUN_LIMIT,
        window: 'day' as const,
        windowStart: startOfUtcDay(now),
        resetsAt: nextUtcMidnight(now),
      }
    : {
        limit: FREE_RUN_LIMIT,
        window: 'lifetime' as const,
        windowStart: null,
        resetsAt: null,
      };

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  reserve(userId: number, resumeId: number): Promise<{ aiRun: AiRun; reused: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      await serialiseReservationsOfUser(tx, userId);

      const now = new Date();
      const staleBefore = new Date(now.getTime() - RESERVATION_TTL_MS);

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { plan: true, planExpiresAt: true },
      });
      const resume = await tx.resume.findUnique({
        where: { id: resumeId, userId },
        select: { id: true },
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      await tx.aiRun.updateMany({
        where: { resumeId, status: AiRunStatus.RESERVED, createdAt: { lt: staleBefore } },
        data: { status: AiRunStatus.FAILED, settledAt: now },
      });

      const existing = await tx.aiRun.findFirst({
        where: { resumeId, userId, status: AiRunStatus.RESERVED },
        orderBy: { id: 'desc' },
      });

      if (!existing) {
        const plan = getEffectivePlan(user, now);
        const { limit, resetsAt } = quotaFor(plan, now);
        const used = await this.countUsed(tx, userId, plan, now);

        if (used >= limit) {
          throw new QuotaExceededError(resetsAt);
        }
      }

      const aiRun =
        existing ??
        (await tx.aiRun.create({
          data: { userId, resumeId, kind: AiRunKind.RESUME_ANALYSIS },
        }));

      await tx.resume.update({
        where: { id: resumeId },
        data: { analysisStatus: ResumeAnalysisStatus.QUEUED, analysisError: null },
      });

      return { aiRun, reused: !!existing };
    });
  }

  async settleSucceeded(aiRunId: number, usage: AiUsage, db: Db = this.prisma): Promise<void> {
    const { count } = await db.aiRun.updateMany({
      where: { id: aiRunId, status: { in: [AiRunStatus.RESERVED, AiRunStatus.FAILED] } },
      data: {
        status: AiRunStatus.SUCCEEDED,
        generationId: usage.generationId || null,
        promptTokens: usage.promptTokens,
        cachedTokens: usage.cachedTokens,
        completionTokens: usage.completionTokens,
        cost: usage.cost,
        settledAt: new Date(),
      },
    });

    if (count === 0) {
      this.logger.warn(`AiRun ${aiRunId} was not settleable as SUCCEEDED`);
    }
  }

  async settleFailed(aiRunId: number, generationId?: string): Promise<void> {
    await this.prisma.aiRun.updateMany({
      where: { id: aiRunId, status: AiRunStatus.RESERVED },
      data: {
        status: AiRunStatus.FAILED,
        settledAt: new Date(),
        ...(generationId && { generationId }),
      },
    });
  }

  async getUsage(userId: number): Promise<IAiUsageResponse> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = getEffectivePlan(user, now);
    const { limit, window, resetsAt } = quotaFor(plan, now);

    return {
      plan,
      used: await this.countUsed(this.prisma, userId, plan, now),
      limit,
      window,
      resetsAt: resetsAt?.toISOString() ?? null,
    };
  }

  private countUsed(db: Db, userId: number, plan: Plan, now: Date): Promise<number> {
    const { windowStart } = quotaFor(plan, now);
    const staleBefore = new Date(now.getTime() - RESERVATION_TTL_MS);

    return db.aiRun.count({
      where: {
        userId,
        ...(windowStart && { createdAt: { gte: windowStart } }),
        OR: [
          { status: AiRunStatus.SUCCEEDED },
          { status: AiRunStatus.RESERVED, createdAt: { gte: staleBefore } },
        ],
      },
    });
  }
}
