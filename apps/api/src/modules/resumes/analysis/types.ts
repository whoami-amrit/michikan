import { RESUME_ANALYZER_JOB_NAME } from '@common/constants';
import type { AiRun } from 'db';

export interface IAnalysisReservation {
  aiRun: AiRun;
  reused: boolean;
}

export interface IAnalyzerJobData {
  type: typeof RESUME_ANALYZER_JOB_NAME;
  resumeId: number;
  aiRunId: number;
}
