import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  url: z.string(),
});

export interface IDatabaseConfig extends z.infer<typeof schema> {}

export default registerAs('database', () => {
  return schema.parse({
    url: process.env.DB_URL,
  });
});
