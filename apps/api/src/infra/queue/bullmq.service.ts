import { IHealthCheck } from '@common/types/health-check.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { HEALTH_CHECK_QUEUE } from './constants';

@Injectable()
export class BullMQService {
  constructor(@InjectQueue(HEALTH_CHECK_QUEUE) private readonly healthQueue: Queue) {}

  async healthCheck(): Promise<IHealthCheck> {
    try {
      const client = await this.healthQueue.client;
      const response = await client.ping();

      if (response === 'PONG') {
        return { status: 'up' };
      }

      throw new Error('Unexpected response from key-val storage: ' + response);
    } catch (error) {
      // TODO: log better
      console.error('BullMQ health check failed:', error);
      return { status: 'down', error: 'Bull health check failed' };
    }
  }
}
