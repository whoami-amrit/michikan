import { isHTTPError } from 'ky';
import type { IProblemDetails } from 'shared';

export const ErrorToast = ({ error }: { error?: unknown }) => {
  if (!isHTTPError(error)) {
    return <h1 className="text-sm font-bold text-red-600">Something went wrong :/</h1>;
  }

  const problem = error.data as IProblemDetails;

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
