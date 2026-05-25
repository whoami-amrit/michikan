import { RENDER_QUEUE_NAME } from '@common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import valkeyConfig from 'src/config/valkey.config';

import { BullMqService } from './bullmq.service';

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
      name: RENDER_QUEUE_NAME,
    }),
  ],
  providers: [BullMqService],
  exports: [BullModule, BullMqService],
})
export class QueueModule {}
