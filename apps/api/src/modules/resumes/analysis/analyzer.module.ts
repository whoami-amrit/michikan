import { Module } from '@nestjs/common';

import { AiQuotaModule } from '../../../infra/ai/ai-quota.module';
import { AnalyzerService } from './analyzer.processor';

@Module({
  imports: [AiQuotaModule],
  providers: [AnalyzerService],
})
export class AnalyzerModule {}
