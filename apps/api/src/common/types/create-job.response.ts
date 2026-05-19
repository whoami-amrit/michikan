import { JobStatus } from '@db/enums';

export interface ICreateJobResponse {
  status: JobStatus;
  jobId: number;
}
