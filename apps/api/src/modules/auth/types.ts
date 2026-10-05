export interface IJwtRefreshPayload {
  sub: number;
  sid: string;
}

export type JwtTokenType = 'access' | 'refresh';

export interface IOtpEmailJobData {
  to: string;
  otp: number;
  expiryMinutes: number;
}
