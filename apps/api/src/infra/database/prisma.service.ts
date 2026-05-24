import { IHealthCheck } from '@common/types/health-check.interface';
import { PrismaClient } from '@db/client';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import databaseConfig from 'src/config/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(databaseConfig.KEY) config: ConfigType<typeof databaseConfig>) {
    const adapter = new PrismaPg({
      connectionString: config.url,
      connectionTimeoutMillis: 5000, // 5 seconds
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async healthCheck(): Promise<IHealthCheck> {
    this.logger.debug('Performing database health check...');

    try {
      await this.$queryRaw`SELECT 1`;

      this.logger.debug('Database health check passed.');

      return {
        status: 'up',
      };
    } catch (error) {
      // TODO: log better
      this.logger.error(error);
      return {
        status: 'down',
        error: 'Database health check failed',
      };
    }
  }
}
