import { JwtTokenType } from './types';

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export const BCRYPT_SALT_ROUNDS = 10;

export const TOKEN_VALIDITY_MAP: Record<JwtTokenType, number> = {
  access: 10 * 60 * 1000,
  refresh: 7 * 24 * 60 * 60 * 1000,
};

export const OTP_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LOCKOUT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
