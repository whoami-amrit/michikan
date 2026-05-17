import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/database/prisma.service';
import { BullMQService } from '../../infra/queue/bullmq.service';
import { S3Service } from '../../infra/storage/s3.service';
import { IHeathCheckResponse } from './responses/health.response';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bullMQService: BullMQService,
    private readonly s3Service: S3Service,
  ) {}

  async checkHealth(): Promise<IHeathCheckResponse> {
    const healthChecks = await Promise.all([
      this.prisma.healthCheck(),
      this.bullMQService.healthCheck(),
      this.s3Service.healthCheck(),
    ]);

    const [dbHealth, queueHealth, storageHealth] = healthChecks;

    const baseResponse = {
      db: dbHealth,
      queue: queueHealth,
      storage: storageHealth,
    };

    if (healthChecks.every(({ status }) => status === 'up')) {
      return { status: 'up', ...baseResponse };
    }

    if (healthChecks.every(({ status }) => status === 'down')) {
      return { status: 'down', ...baseResponse };
    }

    return {
      status: 'partial',
      ...baseResponse,
    };
  }
}
