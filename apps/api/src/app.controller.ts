import { SkipAuth } from '@common/decorators/skip-auth.decorator';
import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { IHealthCheckResponse } from './types';

// this endpoint will be hidden behind the load balancer
// therefore making it a public endpoint
@SkipAuth()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): Promise<IHealthCheckResponse> {
    return this.appService.checkHealth();
  }
}
