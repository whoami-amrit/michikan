export interface IQueueAnalysisResponse {
  status: 'QUEUED';
  aiRunId: number;
}

export const AI_QUOTA_EXCEEDED_CODE = 'AI_QUOTA_EXCEEDED';

export interface IQuotaExceededResponse {
  code: typeof AI_QUOTA_EXCEEDED_CODE;
  resetsAt: string | null;
}
