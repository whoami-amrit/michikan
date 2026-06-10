import { JobStatus } from '@michikan/db';

export interface ICreateJobResponse {
  status: JobStatus;
  jobId: number;
}
