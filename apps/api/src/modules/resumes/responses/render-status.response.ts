import { ResumeRenderJob } from '@db/client';

export interface IRenderStatusResponse {
  status: ResumeRenderJob['status'] | null;
  error?: ResumeRenderJob['error'];
  downloadUrl?: string;
}
