import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './infra/database/database.module';
import { LoggerModule } from './infra/logger/logger.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { AnalyzerModule } from './modules/analysis/processors/analyzer.module';
import { RenderResumeProcessor } from './modules/resumes/processors/render-resume.processor';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    QueueModule,
    DatabaseModule,
    StorageModule,
    AnalyzerModule,
  ],
  providers: [RenderResumeProcessor],
})
export class WorkerModule {}
