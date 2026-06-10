import { z } from 'zod';

import ResumeJsonSchema from '../../types/resume-json';

const schema = z.object({
  json: ResumeJsonSchema.optional(),
});

export type IUpdateResumeDto = z.infer<typeof schema>;

export default schema;
