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
import { CreateResumeSchema, IGetResumesResponse, UpdateResumeSchema } from 'shared';

import { ResumeService } from './resumes.service';

class CreateResumeDto extends createZodDto(CreateResumeSchema) {}
class UpdateResumeDto extends createZodDto(UpdateResumeSchema) {}

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post(':id/render')
  @HttpCode(HttpStatus.ACCEPTED)
  async getRenderedResume(
    @Param('id', ParseIntPipe) jobId: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return await this.resumeService.renderPdf(jobId, user.sub);
  }

  @Get('jobs/:id/status')
  async getRenderStatus(
    @Param('id', ParseIntPipe) resumeId: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return await this.resumeService.getRenderStatus(resumeId, user.sub);
  }

  @Get()
  getAll(@CurrentUser() user: IJwtAccessPayload): Promise<IGetResumesResponse[]> {
    return this.resumeService.getAll(user.sub);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) resumeId: number, @CurrentUser() user: IJwtAccessPayload) {
    return this.resumeService.get(user.sub, resumeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateResumeDto, @CurrentUser() user: IJwtAccessPayload) {
    return this.resumeService.create(user.sub, body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) resumeId: number,
    @Body() body: UpdateResumeDto,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return this.resumeService.update(resumeId, user.sub, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) resumeId: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    await this.resumeService.delete(resumeId, user.sub);
  }
}
