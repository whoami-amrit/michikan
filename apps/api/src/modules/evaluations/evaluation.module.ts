import { COMMON_BULL_QUEUE_OPTIONS, JD_EVALUATION_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ResumeModule } from '../resumes/resumes.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [
    ResumeModule,
    BullModule.registerQueue({
      name: JD_EVALUATION_QUEUE_NAME,
      ...COMMON_BULL_QUEUE_OPTIONS,
    }),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule {}
