import { RENDER_QUEUE_NAME } from '@common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BullMqService implements OnModuleInit {
  private readonly logger = new Logger(BullMqService.name);

  constructor(@InjectQueue(RENDER_QUEUE_NAME) private readonly renderQueue: Queue) {}

  async onModuleInit() {
    await this.healthCheck();
    this.logger.log('Successfully connected to BullMQ');
  }

  async healthCheck(): Promise<void> {
    try {
      const client = await this.renderQueue.client;
      await client.ping();
    } catch (error) {
      this.logger.error(
        'BullMq health check failed',
        error instanceof Error ? error.stack : { error },
      );

      throw error;
    }
  }
}
