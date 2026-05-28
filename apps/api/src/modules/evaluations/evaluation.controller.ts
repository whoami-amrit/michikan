import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { EvaluateJDRelevanceBodyDto } from './dto/evaluate-jd.dto';
import { EvaluationService } from './evaluation.service';

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
