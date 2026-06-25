import { z } from 'zod';

import { resourceDescriptionSchema, resourceNameSchema, ResumeJsonSchema } from '../../common.zod';

const schema = z.object({
  json: ResumeJsonSchema,
  name: resourceNameSchema,
  description: resourceDescriptionSchema,
});

export type ICreateResumeDto = z.infer<typeof schema>;
export type ICreateResumeDtoInput = z.input<typeof schema>;

export default schema;
