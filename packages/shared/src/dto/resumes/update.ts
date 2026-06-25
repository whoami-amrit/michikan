import { z } from 'zod';

import { resourceDescriptionSchema, ResumeJsonSchema } from '../../common.zod';

const schema = z.object({
  description: resourceDescriptionSchema,
  json: ResumeJsonSchema,
});

export type IUpdateResumeDto = z.infer<typeof schema>;

export default schema;
