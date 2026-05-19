import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

// apps/api/src/worker.main.ts
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();
}
bootstrap();
