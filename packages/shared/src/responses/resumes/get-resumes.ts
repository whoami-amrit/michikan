import { Job, Resume } from 'db';

export interface IGetResumesResponse extends Omit<Resume, 'json'> {
  jobs: Pick<Job, 'id'>[];
}
