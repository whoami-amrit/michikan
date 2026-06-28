import { COMMON_BULL_QUEUE_OPTIONS, JD_ANALYSIS_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: JD_ANALYSIS_QUEUE_NAME,
      ...COMMON_BULL_QUEUE_OPTIONS,
    }),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
