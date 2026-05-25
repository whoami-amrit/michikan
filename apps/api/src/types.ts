export type IServiceHealthCheckResult =
  | {
      status: 'up';
      error?: never;
    }
  | {
      status: 'down';
      error: string;
    };

export interface IHealthCheckResponse extends Record<
  'db' | 'queue' | 'storage',
  IServiceHealthCheckResult
> {
  status: 'up' | 'down' | 'partial';
}
