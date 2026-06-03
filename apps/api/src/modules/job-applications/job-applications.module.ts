import { COMMON_BULL_QUEUE_OPTIONS, JD_ANALYSIS_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ResumeModule } from '../resumes/resumes.module';
import { JobApplicationController } from './job-applications.controller';
import { JobApplicationsService } from './job-applications.service';

@Module({
  imports: [
    ResumeModule,
    BullModule.registerQueue({
      name: JD_ANALYSIS_QUEUE_NAME,
      ...COMMON_BULL_QUEUE_OPTIONS,
    }),
  ],
  controllers: [JobApplicationController],
  providers: [JobApplicationsService],
})
export class JobApplicationModule {}
