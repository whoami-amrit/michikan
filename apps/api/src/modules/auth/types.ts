export interface IJwtRefreshPayload {
  sub: number;
  sid: string;
}

export type JwtTokenType = 'access' | 'refresh';
