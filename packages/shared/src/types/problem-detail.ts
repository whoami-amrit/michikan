export interface IProblemDetails {
  status: number;
  title: string;
  detail?: string | string[];
  timestamp: string;
  instance: string;
  resetsAt?: string | null;
}
