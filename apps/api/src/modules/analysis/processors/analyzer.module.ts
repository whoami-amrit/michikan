import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { AnalyzerService } from './analyzer.processor';

@Module({
  providers: [AnalyzerService, AiService],
})
export class AnalyzerModule {}
