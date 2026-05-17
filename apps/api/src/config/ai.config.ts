import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  geminiApiKey: z.string(),
});

export interface IAIConfig extends z.infer<typeof schema> {}

export default registerAs('ai', () => {
  return schema.parse({
    geminiApiKey: process.env.GEMINI_API_KEY,
  });
});
