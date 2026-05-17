import { IHealthCheck } from '@common/types/health-check.interface';
import { PrismaClient } from '@db/client';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import databaseConfig from 'src/config/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(databaseConfig.KEY) config: ConfigType<typeof databaseConfig>) {
    const adapter = new PrismaPg({
      connectionString: config.url,
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
    try {
      await this.$queryRaw`SELECT 1`;

      return {
        status: 'up',
      };
    } catch (error) {
      // TODO: log better
      console.error('Database health check failed:', error);

      return {
        status: 'down',
        error: 'Database health check failed',
      };
    }
  }
}
