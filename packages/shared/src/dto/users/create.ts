import { z } from 'zod';

import { emailSchema, nameSchema } from '../../common.zod';

const schema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export type ICreateUserDto = z.infer<typeof schema>;

export { schema as CreateUserDto };
