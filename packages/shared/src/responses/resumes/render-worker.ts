import { ICreateWorkerResponse } from '../common';

export interface ICreateRenderWorkerResponse extends ICreateWorkerResponse {
  downloadUrl?: string;
}
