import { z } from 'zod';

import { zodSafeString } from '../../common.zod';

export const companyNameSchema = z.string().nonempty('Company name must not be empty').max(100);
export const jobTitleSchema = z.string().nonempty('Job title must not be empty').max(100);
export const notesSchema = zodSafeString.pipe(
  z.string().max(5000, 'Notes must not exceed 5000 characters').optional(),
);
export const applicationUrlSchema = zodSafeString.pipe(z.url().max(10000).optional());
