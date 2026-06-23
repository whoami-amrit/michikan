import { z } from 'zod';

import { emailSchema } from '../../common.zod';
import { passwordSchema } from './common';

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type ILoginDto = z.infer<typeof schema>;

export default schema;
