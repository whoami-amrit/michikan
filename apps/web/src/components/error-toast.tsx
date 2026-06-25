import type { IProblemDetails } from 'shared';

export const ErrorToast = ({ problem }: { problem: IProblemDetails }) => {
  return (
    <div className="flex-col gap-4">
      <h1 className="text-sm font-bold text-red-600">{problem.title}</h1>

      <div className="flex-col gap-2">
        {Array.isArray(problem.detail)
          ? problem.detail.map((detail, key) => <p key={key}>{detail}</p>)
          : problem.detail}
      </div>
    </div>
  );
};
