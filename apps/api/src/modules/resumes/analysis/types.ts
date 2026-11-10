import { RESUME_ANALYZER_JOB_NAME } from '@common/constants';

export interface IAnalyzerJobData {
  type: typeof RESUME_ANALYZER_JOB_NAME;
  resumeId: number;
}
