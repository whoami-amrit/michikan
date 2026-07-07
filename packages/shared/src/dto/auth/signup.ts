import { z } from 'zod';

import { CreateUserDto } from '../users/create';
import { passwordSchema } from './common';

const schema = z.object({
  userInfo: CreateUserDto,
  password: passwordSchema,
});

export type ISignupDto = z.infer<typeof schema>;

export default schema;
