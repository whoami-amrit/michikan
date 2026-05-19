import { IResumeJson } from './resume.interface';

export interface IRenderPdfJobData {
  jobId: number;
  json: IResumeJson;
}
