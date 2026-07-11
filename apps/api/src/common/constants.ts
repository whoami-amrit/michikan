import { RegisterQueueOptions } from '@nestjs/bullmq';

export const ACCESS_TOKEN_USER_DATA_KEY = 'user';
export const ACCESS_TOKEN_COOKIE_KEY = 'access_token';
export const REFRESH_TOKEN_COOKIE_KEY = 'refresh_token';
export const PUBLIC_ACCESS_TAG = 'isPublic';
export const ALLOW_UNVERIFIED_TAG = 'allowUnverified';

export const RENDER_QUEUE_NAME = 'resumes';
export const RENDER_PDF_JOB_NAME = 'render-pdf';

export const ANALYSER_QUEUE_NAME = 'analysis';
export const JOB_FIT_ANALYZER_JOB_NAME = 'job-fit-analyzer' as const;
export const RESUME_ANALYZER_JOB_NAME = 'resume-analyzer' as const;
export const JOB_AT_A_GLANCE_JOB_NAME = 'job-at-a-glance' as const;

export const COMMON_BULL_QUEUE_OPTIONS: Omit<RegisterQueueOptions, 'name'> = {
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 100, age: 7 * 24 * 3600 }, // save for a week for debugging
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2 seconds between initial retry, increasing
    },
  },
};
