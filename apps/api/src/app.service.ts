import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from './infra/database/prisma.service';
import { BullMqService } from './infra/queue/bullmq.service';
import { IHealthCheckResponse, IServiceHealthCheckResult } from './types';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bullMQService: BullMqService,
  ) {}

  async checkHealth(): Promise<IHealthCheckResponse> {
    const settledResults = await Promise.allSettled([
      this.prisma.healthCheck(),
      this.bullMQService.healthCheck(),
    ]);

    const healthCheckResults = settledResults.map<IServiceHealthCheckResult>((result) => {
      if (result.status === 'fulfilled') {
        return { status: 'up' };
      }

      return {
        status: 'down',
        error: result.reason,
      };
    });

    const [dbHealth, queueHealth] = healthCheckResults;

    const services = {
      db: dbHealth,
      queue: queueHealth,
    };

    if (healthCheckResults.every(({ status }) => status === 'up')) {
      return { status: 'up', ...services };
    }

    this.logger.error(services);

    if (healthCheckResults.every(({ status }) => status === 'down')) {
      return { status: 'down', ...services };
    }

    return {
      status: 'partial',
      ...services,
    };
  }
}
