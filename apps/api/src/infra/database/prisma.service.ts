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

    await this.healthCheck();
    this.logger.log('Successfully connected to Prisma/PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async healthCheck(): Promise<void> {
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'Prisma/PostgreSQL health check failed',
        error instanceof Error ? error.stack : { error },
      );

      throw error;
    }
  }
}
