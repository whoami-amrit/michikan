import { ResumeRenderJob } from '@michikan/db';

export interface IRenderStatusResponse {
  status: ResumeRenderJob['status'] | null;
  error?: ResumeRenderJob['error'];
  downloadUrl?: string;
}
