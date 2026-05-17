import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  admin: z.string().default('admin'),
  name: z.string().default('michi'),
  url: z.string(),
  password: z.string(),
});

export interface IDatabaseConfig extends z.infer<typeof schema> {}

export default registerAs('database', () => {
  return schema.parse({
    admin: process.env.DB_ADMIN,
    name: process.env.DB_NAME,
    url: process.env.DB_URL,
    password: process.env.DB_PASSWORD,
  });
});
