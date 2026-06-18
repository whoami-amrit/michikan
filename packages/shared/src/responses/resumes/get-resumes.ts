import { JobApplication, Resume } from 'db';

export interface IGetResumesResponse extends Omit<Resume, 'json'> {
  jobApplications: Pick<JobApplication, 'id'>[];
}
