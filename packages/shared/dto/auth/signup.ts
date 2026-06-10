import { z } from 'zod';

const schema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().max(255, 'Name must not exceed 255 characters'),
});

export type ISignupDto = z.infer<typeof schema>;

export default schema;
