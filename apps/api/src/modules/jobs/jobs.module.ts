import { ANALYSER_QUEUE_NAME, COMMON_BULL_QUEUE_OPTIONS } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ANALYSER_QUEUE_NAME,
      ...COMMON_BULL_QUEUE_OPTIONS,
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
