import { COMMON_BULL_QUEUE_OPTIONS, EMAIL_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        ...COMMON_BULL_QUEUE_OPTIONS.defaultJobOptions,
        // job data carries the plaintext otp, so don't keep it around in valkey
        removeOnComplete: true,
        removeOnFail: { age: 3600 },
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
