import { z } from 'zod';

import ResumeJsonSchema from '../../types/resume-json';

const schema = z.object({
  json: ResumeJsonSchema,
  name: z.string().min(1, 'Resume name is required').max(50),
  description: z.string().max(200).optional(),
});

export type ICreateResumeDto = z.infer<typeof schema>;

export default schema;
