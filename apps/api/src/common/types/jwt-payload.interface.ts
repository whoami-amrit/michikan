export interface IJwtAccessPayload {
  sub: number;
  plan: 'free' | 'pro';
  verified: boolean;
}
