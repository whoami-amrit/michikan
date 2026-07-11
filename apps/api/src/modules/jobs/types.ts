import {
  JOB_AT_A_GLANCE_JOB_NAME,
  JOB_FIT_ANALYZER_JOB_NAME,
  RESUME_ANALYZER_JOB_NAME,
} from '@common/constants';

export type IAnalyzerJobData =
  | {
      type: typeof JOB_FIT_ANALYZER_JOB_NAME;
      analysisId: number;
      isCreatedFromJob: boolean;
    }
  | {
      type: typeof RESUME_ANALYZER_JOB_NAME;
      resumeId: number;
    }
  | {
      type: typeof JOB_AT_A_GLANCE_JOB_NAME;
      jobId: number;
    };
