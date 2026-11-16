import { z } from 'zod';

import { ResumeJsonSchema } from '../../common.zod';

const schema = z.object({
  json: ResumeJsonSchema,
});

export type IUpdateResumeDto = z.infer<typeof schema>;

export default schema;
