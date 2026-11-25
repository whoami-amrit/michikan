import { Job, Resume } from 'db';

export type IResumeLastInteraction =
  | { type: 'RESUME_CREATED' | 'RESUME_UPDATED'; at: Date }
  | { type: 'JOB_LINKED'; at: Date; job: Pick<Job, 'id' | 'role' | 'company'> };

export interface IGetResumesResponse extends Omit<Resume, 'json'> {
  jobs: Pick<Job, 'id'>[];
  lastInteraction: IResumeLastInteraction;
}
