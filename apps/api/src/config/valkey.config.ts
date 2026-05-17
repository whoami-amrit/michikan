import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  host: z.string(),
  port: z.coerce.number().default(6379),
});

export interface IValkeyConfig extends z.infer<typeof schema> {}

export default registerAs('valkey', () => {
  return schema.parse({
    host: process.env.VALKEY_HOST,
    port: process.env.VALKEY_PORT,
  });
});
