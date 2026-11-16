import type { Plan } from 'db';

export interface IAiUsageResponse {
  plan: Plan;
  used: number;
  limit: number;
  window: 'lifetime' | 'day';
  resetsAt: string | null;
}
