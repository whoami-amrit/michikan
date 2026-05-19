import { JD_EVALUATION_QUEUE_NAME } from '@common/constants';
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
      defaultJobOptions: {
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { count: 100, age: 7 * 24 * 3600 }, // save for a week for debugging
      },
    }),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule {}
