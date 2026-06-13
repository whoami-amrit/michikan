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
import { createZodDto } from 'node_modules/nestjs-zod/dist/dto.mjs';
import { CreateJobApplicationSchema, UpdateJobApplicationStatusSchema } from 'shared';

import { JobApplicationsService } from './job-applications.service';

class CreateJobApplicationDto extends createZodDto(CreateJobApplicationSchema) {}
class UpdateJobApplicationStatusDto extends createZodDto(UpdateJobApplicationStatusSchema) {}

@Controller('job-applications')
export class JobApplicationController {
  constructor(private readonly service: JobApplicationsService) {}

  @Get()
  getAll(@CurrentUser() user: IJwtAccessPayload) {
    return this.service.get(user.sub);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobApplicationId: number,
  ) {
    return this.service.get(user.sub, jobApplicationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: IJwtAccessPayload, @Body() body: CreateJobApplicationDto) {
    return this.service.create(body, user.sub);
  }

  @Post(':id/re-evaluate')
  @HttpCode(HttpStatus.ACCEPTED)
  reEvaluate(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobApplicationId: number,
  ) {
    return this.service.reEvaluate(jobApplicationId, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobApplicationId: number,
    @Body() body: UpdateJobApplicationStatusDto,
  ) {
    return this.service.update(jobApplicationId, user.sub, body);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobApplicationId: number,
  ) {
    return this.service.delete(jobApplicationId, user.sub);
  }

  @Post(':id/save')
  save(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) jobApplicationId: number,
  ) {
    return this.service.save(jobApplicationId, user.sub);
  }
}
