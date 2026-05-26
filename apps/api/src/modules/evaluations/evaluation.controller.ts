import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { EvaluationService } from './evaluation.service';

const evaluateJDRelevanceBodySchema = z.object({
  jd: z.string().max(10000),
});

export class EvaluateJDRelevanceBodyDto extends createZodDto(evaluateJDRelevanceBodySchema) {}

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evalService: EvaluationService) {}

  @Post()
  evaluateJDRelevance(
    @Body() evaluateJDRelevanceBody: EvaluateJDRelevanceBodyDto,
    @CurrentUser() user: IJwtAccessPayload,
  ) {
    return this.evalService.createJDMatchJob(user.sub, evaluateJDRelevanceBody.jd);
  }

  @Get('jobs/:id/status')
  getJDMatchJobStatus(
    @CurrentUser() user: IJwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.evalService.getJDMatchJobStatus(user.sub, id);
  }
}
