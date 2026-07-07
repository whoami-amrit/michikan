import { z } from 'zod';

export const passwordSchema = z
  .string()
  .regex(/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){7,15}$/, {
    message: 'Use 8–16 characters including uppercase, lowercase, a number, and a special symbol',
  });
