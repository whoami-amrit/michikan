import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './infra/database/database.module';
import { EmailModule } from './infra/email/email.module';
import { LoggerModule } from './infra/logger/logger.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { AnalyzerModule } from './modules/analysis/processors/analyzer.module';
import { OtpEmailProcessor } from './modules/auth/processors/otp-email.processor';
import { RenderResumeProcessor } from './modules/resumes/processors/render-resume.processor';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    QueueModule,
    DatabaseModule,
    StorageModule,
    EmailModule,
    AnalyzerModule,
  ],
  providers: [RenderResumeProcessor, OtpEmailProcessor],
})
export class WorkerModule {}
