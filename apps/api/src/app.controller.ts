import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { IHeathCheckResponse } from './common/types/health.response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): Promise<IHeathCheckResponse> {
    return this.appService.checkHealth();
  }
}
