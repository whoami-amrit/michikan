import { JobStatus } from 'db';

export interface ICreateJobResponse {
  status: JobStatus;
  jobId: number;
}
