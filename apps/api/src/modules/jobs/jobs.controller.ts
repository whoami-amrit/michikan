import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { CreateJobSchema, UpdateJobStatusSchema } from 'shared';

import { JobsService } from './jobs.service';

class CreateJobDto extends createZodDto(CreateJobSchema) {}
class UpdateJobStatusDto extends createZodDto(UpdateJobStatusSchema) {}

@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  getAll(@CurrentUser() user: IJwtAccessPayload) {
    return this.service.getAll(user.sub);
  }

  @Get(':id')
  getById(@CurrentUser() user: IJwtAccessPayload, @Param('id', ParseIntPipe) jobId: number) {
    return this.service.get(user.sub, jobId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: IJwtAccessPayload, @Body() body: CreateJobDto) {
    return this.service.create(body, user.sub);
  }

  @Post(':id/re-evaluate')
  @HttpCode(HttpStatus.ACCEPTED)
  reEvaluate(@CurrentUser() user: IJwtAccessPayload, @Param('id', ParseIntPipe) jobId: number) {
    return this.service.reEvaluate(jobId, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobId: number,
    @Body() body: UpdateJobStatusDto,
  ) {
    return this.service.update(jobId, user.sub, body);
  }

  @Delete(':id')
  delete(@CurrentUser() user: IJwtAccessPayload, @Param('id', ParseIntPipe) jobId: number) {
    return this.service.delete(jobId, user.sub);
  }

  @Post(':id/save')
  save(@CurrentUser() user: IJwtAccessPayload, @Param('id', ParseIntPipe) jobId: number) {
    return this.service.save(jobId, user.sub);
  }
}
