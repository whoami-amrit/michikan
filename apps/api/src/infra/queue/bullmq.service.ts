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
    this.logger.debug('Successfully connected to BullMQ');
  }

  async healthCheck(): Promise<void> {
    const client = await this.renderQueue.client;
    if (client.status === 'end') {
      throw new Error('Unable to connect to BullMQ: Redis client is disconnected');
    }
  }
}
