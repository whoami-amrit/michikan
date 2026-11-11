export interface IProblemDetails {
  status: number;
  title: string;
  detail?: string | string[];
  timestamp: string;
  instance: string;
  code?: string;
  resetsAt?: string | null;
}
