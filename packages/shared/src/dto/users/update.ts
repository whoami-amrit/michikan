import { z } from 'zod';

import { nameSchema, zodSafeString } from '../../common.zod';

const schema = z.object({
  name: zodSafeString.pipe(nameSchema.optional()),
  email: z.never('Email cannot be updated').optional(),
  autoAnalyseResume: z.boolean().optional(),
});

export type IUpdateUserDto = z.infer<typeof schema>;

export default schema;
