import z from 'zod';

import { ResumeJsonSchema } from '../common.zod';

export type IResumeJson = z.infer<typeof ResumeJsonSchema>;
export type IResumeJsonInput = z.input<typeof ResumeJsonSchema>;
