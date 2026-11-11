export class QuotaExceededError extends Error {
  constructor(readonly resetsAt: Date | null) {
    super('AI analysis quota exceeded');
    this.name = 'QuotaExceededError';
  }
}
