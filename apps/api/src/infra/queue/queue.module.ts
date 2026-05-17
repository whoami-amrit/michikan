import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import valkeyConfig from 'src/config/valkey.config';

import { BullMQService } from './bullmq.service';
import { HEALTH_CHECK_QUEUE } from './constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [valkeyConfig.KEY],
      useFactory: (config: ConfigType<typeof valkeyConfig>) => ({
        connection: {
          host: config.host,
          port: config.port,
        },
      }),
    }),

    BullModule.registerQueue({
      name: HEALTH_CHECK_QUEUE,
    }),
  ],
  providers: [BullMQService],
  exports: [BullModule, BullMQService],
})
export class QueueModule {}
