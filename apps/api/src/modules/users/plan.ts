import { Plan, type User } from 'db';

export const getEffectivePlan = (
  user: Pick<User, 'plan' | 'planExpiresAt'>,
  now: Date = new Date(),
): Plan =>
  user.plan === Plan.PRO && (user.planExpiresAt === null || user.planExpiresAt > now)
    ? Plan.PRO
    : Plan.FREE;
