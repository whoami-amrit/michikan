import { Injectable } from '@nestjs/common';

import { PrismaService } from './infra/database/prisma.service';
import { BullMqService } from './infra/queue/bullmq.service';
import { S3Service } from './infra/storage/s3.service';
import { IHealthCheckResponse, IServiceHealthCheckResult } from './types';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bullMQService: BullMqService,
    private readonly s3Service: S3Service,
  ) {}

  async checkHealth(): Promise<IHealthCheckResponse> {
    const settledResults = await Promise.allSettled([
      this.prisma.healthCheck(),
      this.bullMQService.healthCheck(),
      this.s3Service.healthCheck(),
    ]);

    const healthCheckResults = settledResults.map<IServiceHealthCheckResult>((result) => {
      if (result.status === 'fulfilled') {
        return { status: 'up' };
      }

      return {
        status: 'down',
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    const [dbHealth, queueHealth, storageHealth] = healthCheckResults;

    const services = {
      db: dbHealth,
      queue: queueHealth,
      storage: storageHealth,
    };

    if (healthCheckResults.every(({ status }) => status === 'up')) {
      return { status: 'up', ...services };
    }

    if (healthCheckResults.every(({ status }) => status === 'down')) {
      return { status: 'down', ...services };
    }

    return {
      status: 'partial',
      ...services,
    };
  }
}
