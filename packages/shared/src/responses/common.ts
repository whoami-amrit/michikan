import { WorkerStatus } from 'db';

export interface ICreateWorkerResponse {
  status: WorkerStatus;
  workerId: number;
}
