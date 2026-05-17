export type IHealthCheck =
  | {
      status: 'up';
      error?: never; // Optional error message, only present when status is 'down'
    }
  | {
      status: 'down';
      error: string;
    };
