import { IHealthCheck } from '@common/types/health-check.interface';

export interface IHeathCheckResponse {
  status: 'up' | 'down' | 'partial';
  db: IHealthCheck;
}
