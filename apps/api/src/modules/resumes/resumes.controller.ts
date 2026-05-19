import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtPayload } from '@common/types/jwt-payload.interface';
import {
  BadRequestException,
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
import { ResumeDownloadDto } from './dto/download-resume.dto';
import { UpdateActiveResumeRequestDto } from './dto/new-active-resume.dto';
import { UpdateResumeRequestDto } from './dto/update-resume.dto';
import { ResumeService } from './resumes.service';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('active')
  async getActiveResumeForUser(@CurrentUser() user: IJwtPayload) {
    return this.resumeService.getActiveResume(user.userId);
  }

  @Post(':id/render')
  async getRenderedResume(
    @Param('id', ParseIntPipe) id: number,
    @Body() resumeDownloadDto: ResumeDownloadDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    switch (resumeDownloadDto.type) {
      case 'pdf':
        return await this.resumeService.renderPdf(id, user.userId);
      default:
        throw new BadRequestException('Unsupported resume download type');
    }
  }

  @Get('jobs/:id/status')
  async getRenderStatus(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: IJwtPayload) {
    return await this.resumeService.getRenderStatus(id, user.userId);
  }

  @Patch('active')
  @HttpCode(204)
  async setActiveResumeForUser(
    @CurrentUser() user: IJwtPayload,
    @Body() { resumeId }: UpdateActiveResumeRequestDto,
  ) {
    await this.resumeService.setActiveResume(user.userId, resumeId);
  }

  @Get()
  async getAllResumesForUser(@CurrentUser() user: IJwtPayload) {
    return this.resumeService.getAllForUser(user.userId);
  }

  @Post()
  @HttpCode(201)
  async createResume(
    @Body() createResumeDto: CreateResumeRequestDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.resumeService.create(user.userId, createResumeDto);
  }

  @Patch(':id')
  async updateResume(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResumeDto: UpdateResumeRequestDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.resumeService.update(id, user.userId, updateResumeDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteResume(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: IJwtPayload) {
    await this.resumeService.delete(id, user.userId);
  }
}
