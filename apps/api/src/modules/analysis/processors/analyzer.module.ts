import { Module } from '@nestjs/common';

import { AnalyzerService } from './analyzer.processor';

@Module({
  providers: [AnalyzerService],
})
export class AnalyzerModule {}
