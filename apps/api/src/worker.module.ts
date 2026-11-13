import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { AiModule } from './infra/ai/ai.module';
import { DatabaseModule } from './infra/database/database.module';
import { EmailModule } from './infra/email/email.module';
import { LoggerModule } from './infra/logger/logger.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { OtpEmailProcessor } from './modules/auth/processors/otp-email.processor';
import { AnalyzerModule } from './modules/resumes/analysis/analyzer.module';
import { RenderResumeProcessor } from './modules/resumes/processors/render-resume.processor';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    QueueModule,
    DatabaseModule,
    StorageModule,
    EmailModule,
    AiModule,
    AnalyzerModule,
  ],
  providers: [RenderResumeProcessor, OtpEmailProcessor],
})
export class WorkerModule {}
