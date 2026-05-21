import { COMMON_BULL_QUEUE_OPTIONS, RENDER_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ResumeController } from './resumes.controller';
import { ResumeService } from './resumes.service';

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue({
      name: RENDER_QUEUE_NAME,
      ...COMMON_BULL_QUEUE_OPTIONS,
    }),
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule { }
