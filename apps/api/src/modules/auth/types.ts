export interface IJwtRefreshPayload {
  sub: number;
  sid: string;
}

export interface IJwtEmailVerifyPayload {
  sub: number;
  email: string;
}

export type JwtTokenType = 'access' | 'refresh' | 'email-verify';
