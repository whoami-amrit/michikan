import { z } from 'zod';

import { emailSchema } from '../../common.zod';

const schema = z.object({
  email: emailSchema,
  password: z.string().max(200).nonempty('Password is required'),
});

export type ILoginDto = z.infer<typeof schema>;

export default schema;
