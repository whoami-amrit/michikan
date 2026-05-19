import { RegisterQueueOptions } from '@nestjs/bullmq/dist/interfaces/register-queue-options.interface';

export const ACCESS_TOKEN_USER_DATA_KEY = 'user';
export const ACCESS_TOKEN_COOKIE_KEY = 'access_token';
export const REFRESH_TOKEN_COOKIE_KEY = 'refresh_token';
export const SKIP_AUTH_TAG = 'isPublic';

export const RENDER_QUEUE_NAME = 'resumes';
export const RENDER_PDF_JOB_NAME = 'render-pdf';

export const JD_EVALUATION_QUEUE_NAME = 'evaluations';
export const JD_EVALUATION_JOB_NAME = 'jd-evaluation';

export const COMMON_BULL_QUEUE_OPTIONS: Omit<RegisterQueueOptions, 'name'> = {
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 100, age: 7 * 24 * 3600 }, // save for a week for debugging
  },
};
