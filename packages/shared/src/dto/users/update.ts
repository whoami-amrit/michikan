import { z } from 'zod';

const schema = z.object({
  name: z.string().max(255, 'Name must not exceed 255 characters').optional(),
  email: z.never('Email cannot be updated'),
});

export type IUpdateUserDto = z.infer<typeof schema>;

export default schema;
