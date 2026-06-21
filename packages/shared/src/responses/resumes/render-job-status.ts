import { ResumeRenderWorker } from 'db';

export interface IRenderStatusResponse {
  status: ResumeRenderWorker['status'] | null;
  error?: ResumeRenderWorker['error'];
  downloadUrl?: string;
}
