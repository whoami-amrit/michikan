import databaseConfig from '@config/database.config';
import { PrismaClient, PrismaPg } from '@michikan/db';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

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
    this.logger.debug('Successfully connected to Prisma/PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async healthCheck(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
