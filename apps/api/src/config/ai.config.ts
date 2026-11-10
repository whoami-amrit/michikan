import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  openRouterApiKey: z.string().min(1),
  appUrl: z.string().min(1),
});

export interface IAIConfig extends z.infer<typeof schema> {}

export default registerAs('ai', () => {
  return schema.parse({
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    appUrl: process.env.HOSTNAME,
  });
});
