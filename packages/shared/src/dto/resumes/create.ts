import { z } from 'zod';

import { ResumeJsonSchema } from '../../common.zod';

const schema = z.object({
  json: ResumeJsonSchema,
  name: z
    .string()
    .min(1, 'Resume name is required')
    .max(50, 'Resume name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
});

export type ICreateResumeDto = z.infer<typeof schema>;

export default schema;
