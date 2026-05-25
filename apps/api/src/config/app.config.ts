import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  jwtSecret: z.string().min(32),
  renderOutputPath: z.string().default('/tmp/michi-renders'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  env: z.enum(['development', 'production', 'test']).default('production'),
});

export interface IAppConfig extends z.infer<typeof schema> {}

export default registerAs('app', () => {
  return schema.parse({
    jwtSecret: process.env.JWT_SECRET,
    renderOutputPath: process.env.RENDER_OUTPUT_PATH,
    // note: this indicates the minimum log level to log
    // e.g. if set to 'info', 'debug' and 'trace' logs will be ignored
    logLevel: process.env.LOG_LEVEL,
    env: process.env.ENV,
  });
});
