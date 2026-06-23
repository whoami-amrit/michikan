import { z } from 'zod';

export const passwordSchema = z
  .string()
  .regex(/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character & between 8-16 characters long without spaces',
  });
