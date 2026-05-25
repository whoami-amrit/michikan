import { SkipAuth } from '@common/decorators/skip-auth.decorator';
import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { IHealthCheckResponse } from './types';

// fixme: should I skip auth here?
@SkipAuth()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): Promise<IHealthCheckResponse> {
    return this.appService.checkHealth();
  }
}
