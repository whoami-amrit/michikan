import { TriangleAlert } from 'lucide-react';

import { useFieldLintFindings } from '@/lib/resume-lint';

export function ResumeLintFindings({ fieldName }: { fieldName: string }) {
  const findings = useFieldLintFindings(fieldName);
  if (findings.length === 0) return null;

  return (
    <ul data-slot="resume-lint-findings" className="flex flex-col gap-1">
      {findings.map(({ finding, label, line }, index) => (
        <li
          key={`${finding.section_id}:${finding.issue}:${index}`}
          className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {line !== undefined && <span className="font-medium">Line {line}: </span>}
            <span className="font-medium">{label}.</span> {finding.fix}
          </span>
        </li>
      ))}
    </ul>
  );
}
