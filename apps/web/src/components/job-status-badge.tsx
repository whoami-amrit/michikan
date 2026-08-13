import { JobStatus } from 'db/browser';

import { Badge } from './ui/badge';

const getBadgeDetailsFromStatus = (
  status: JobStatus,
): {
  text: string;
  className?: string;
} => {
  switch (status) {
    case JobStatus.INTERVIEW_ONGOING:
      return {
        text: 'Interviews',
        className: 'dark:text-amber-300 dark:bg-amber-950 bg-amber-50 text-amber-700',
      };
    case JobStatus.APPLIED:
      return {
        text: 'Applied',
        className: 'dark:text-blue-300 dark:bg-blue-950 bg-blue-50 text-blue-700',
      };
    case JobStatus.REJECTED:
      return {
        text: 'Rejected',
        className: 'dark:text-red-300 dark:bg-red-950 bg-red-50 text-red-700',
      };
    case JobStatus.ACCEPTED:
      return {
        text: 'Accepted',
        className: 'dark:text-green-300 dark:bg-green-950 bg-green-50 text-green-700',
      };
    case JobStatus.SHORTLISTED:
      return {
        text: 'Shortlisted',
        className: 'dark:text-purple-300 dark:bg-purple-950 bg-purple-50 text-purple-700',
      };
    case JobStatus.NOT_APPLIED:
      return {
        text: 'Not Applied',
      };
    default:
      console.error('Unknown status for job');
      return {
        text: 'Unknown',
      };
  }
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { text, className } = getBadgeDetailsFromStatus(status);
  return (
    <Badge variant="secondary" className={className}>
      {text}
    </Badge>
  );
}
