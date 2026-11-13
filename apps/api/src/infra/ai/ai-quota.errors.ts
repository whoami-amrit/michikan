export class QuotaExceededError extends Error {
  constructor() {
    super('AI analysis quota exceeded');
    this.name = 'QuotaExceededError';
  }
}
