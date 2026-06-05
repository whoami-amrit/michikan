import { JwtTokenType } from './types';

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export const BCRYPT_SALT_ROUNDS = 10;

export const TOKEN_VALIDITY_MAP: Record<JwtTokenType, number> = {
  access: 10 * 60 * 1000,
  refresh: 7 * 24 * 60 * 60 * 1000,
  'email-verify': 24 * 60 * 60 * 1000, // 24 hours
};

export const VERIFY_EMAIL_PATH = 'verify-email';
