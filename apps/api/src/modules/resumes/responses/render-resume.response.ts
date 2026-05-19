import { JobStatus } from '@db/client';

export interface IRenderResumeResponse {
  jobId: number;
  status: JobStatus;
}
