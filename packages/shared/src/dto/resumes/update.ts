import { z } from 'zod';

import ResumeSchema from '../../types/resume-json';

const schema = z.object({
  json: ResumeSchema.optional(),
});

export type IUpdateResumeDto = z.infer<typeof schema>;

export default schema;
