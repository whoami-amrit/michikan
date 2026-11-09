export interface IJwtRefreshPayload {
  sub: number;
  sid: string;
  type: 'refresh';
}

export type JwtTokenType = 'access' | 'refresh';

export interface IOtpEmailJobData {
  to: string;
  otp: number;
  expiryMinutes: number;
}
