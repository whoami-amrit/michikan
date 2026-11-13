export type AiErrorReasonType = 'client' | 'credits' | 'content_filter' | 'provider' | 'output';

export type AiFatalReasonType = Extract<AiErrorReasonType, 'client' | 'credits' | 'content_filter'>;
export type AiRetryableReasonType = Extract<AiErrorReasonType, 'provider' | 'output'>;

export class AiFatalError extends Error {
  constructor(
    message: string,
    readonly reason: AiFatalReasonType,
    readonly generationId?: string,
  ) {
    super(message);
    this.name = 'AiFatalError';
  }
}

export class AiRetryableError extends Error {
  constructor(
    message: string,
    readonly reason: AiRetryableReasonType,
    readonly generationId?: string,
  ) {
    super(message);
    this.name = 'AiRetryableError';
  }
}
