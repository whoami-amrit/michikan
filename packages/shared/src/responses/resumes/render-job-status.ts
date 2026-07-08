import { ResumeRenderWorker } from 'db';

export interface IRenderStatusResponse extends ResumeRenderWorker {
  downloadUrl?: string;
}
