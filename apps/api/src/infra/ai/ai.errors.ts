export type AiErrorReason = 'client' | 'credits' | 'content_filter' | 'provider' | 'output';

export type AiFatalReason = Extract<AiErrorReason, 'client' | 'credits' | 'content_filter'>;
export type AiRetryableReason = Extract<AiErrorReason, 'provider' | 'output'>;

export class AiFatalError extends Error {
  constructor(
    message: string,
    readonly reason: AiFatalReason,
    readonly generationId?: string,
  ) {
    super(message);
    this.name = 'AiFatalError';
  }
}

export class AiRetryableError extends Error {
  constructor(
    message: string,
    readonly reason: AiRetryableReason,
    readonly generationId?: string,
  ) {
    super(message);
    this.name = 'AiRetryableError';
  }
}
