import { Module } from '@nestjs/common';

import { AiQuotaModule } from '../../infra/ai/ai-quota.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AiQuotaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
