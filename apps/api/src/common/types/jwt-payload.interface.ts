import type { Plan } from 'db';

export interface IJwtAccessPayload {
  sub: number;
  plan: Plan;
  verified: boolean;
  type: 'access';
}
