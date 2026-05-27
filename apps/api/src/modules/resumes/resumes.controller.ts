import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateResumeRequestDto } from './dto/create-resume.dto';
import { UpdateActiveResumeRequestDto } from './dto/new-active-resume.dto';
import { UpdateResumeRequestDto } from './dto/update-resume.dto';
import { ResumeService } from './resumes.service';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('active')
  async getActiveResumeForUser(@CurrentUser() user: IJwtAccessPayload) {
    return this.resumeService.getActiveResume(user.sub);
  }

  @Patch('active')
  @HttpCode(204)
  async setActiveResumeForUser(
    @CurrentUser() user: IJwtAccessPayload,
    @Body() { resumeId }: UpdateActiveResumeRequestDto,
  ) {
    await this.resumeService.setActiveResume(user.sub, resumeId);
  }

  @Post(':id/render')
  async getRenderedResume(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return await this.resumeService.renderPdf(id, user.sub);
  }

  @Get('jobs/:id/status')
  async getRenderStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return await this.resumeService.getRenderStatus(id, user.sub);
  }

  @Get()
  async getAllResumesForUser(@CurrentUser() user: IJwtAccessPayload) {
    return this.resumeService.getAllForUser(user.sub);
  }

  @Post()
  @HttpCode(201)
  async createResume(
    @Body() createResumeDto: CreateResumeRequestDto,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return this.resumeService.create(user.sub, createResumeDto);
  }

  @Patch(':id')
  async updateResume(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResumeDto: UpdateResumeRequestDto,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return this.resumeService.update(id, user.sub, updateResumeDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteResume(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    await this.resumeService.delete(id, user.sub);
  }
}
