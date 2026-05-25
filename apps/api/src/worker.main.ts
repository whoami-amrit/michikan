import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { WorkerModule } from './worker.module';

// apps/api/src/worker.main.ts
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await app.init();
}
bootstrap().catch((err) => {
  console.error('Error starting worker application:', err);
  process.exit(1);
});
