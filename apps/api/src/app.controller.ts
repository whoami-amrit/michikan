import { SkipAuth } from '@common/decorators/skip-auth.decorator';
import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { IHeathCheckResponse } from './common/types/health.response';

// fixme: should I skip auth here?
@SkipAuth()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): Promise<IHeathCheckResponse> {
    return this.appService.checkHealth();
  }
}
