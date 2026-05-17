import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  port: z.coerce.number().default(5252),
  jwtSecret: z.string().min(32),
  renderOutputPath: z.string().default('/tmp/michi-renders'),
});

export interface IAppConfig extends z.infer<typeof schema> {}

export default registerAs('app', () => {
  return schema.parse({
    port: process.env.PORT,
    jwtSecret: process.env.JWT_SECRET,
    renderOutputPath: process.env.RENDER_OUTPUT_PATH,
  });
});
