import { z } from 'zod';

import { emailSchema, nameSchema } from '../../common.zod';
import { passwordSchema } from './common';

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type ISignupDto = z.infer<typeof schema>;

export default schema;
