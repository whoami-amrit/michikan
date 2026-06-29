import { CurrentUser } from '@common/decorators/current-user.decorator';
import { type IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { CreateAnalysisSchema } from 'shared';

import { AnalysisService } from './analysis.service';

class CreateAnalysisDto extends createZodDto(CreateAnalysisSchema) {}

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Get()
  getAll(@CurrentUser() user: IJwtAccessPayload) {
    return this.service.getAll(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: IJwtAccessPayload, @Param('id', ParseIntPipe) analysisId: number) {
    return this.service.get(user.sub, analysisId);
  }

  @Post()
  create(@CurrentUser() user: IJwtAccessPayload, @Body() body: CreateAnalysisDto) {
    return this.service.create(body, user.sub);
  }
}
