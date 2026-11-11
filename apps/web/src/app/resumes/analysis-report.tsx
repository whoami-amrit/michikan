import { ArrowUpRight } from 'lucide-react';
import { type IGetResumeResponse, ISSUE_LABELS } from 'shared';

import { Badge } from '@/components/ui/badge';
import { groupFindings } from '@/lib/resume-analysis';
import { type ResolvedFinding } from '@/lib/resume-lint';

type Snapshot = NonNullable<IGetResumeResponse['analysisReport']>;

function FindingBody({ resolved, source, fix }: FindingProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{source === 'linter' ? 'Rule' : 'AI'}</Badge>
        <span className="font-medium">{resolved.label}</span>
        {resolved.line !== undefined && (
          <span className="text-sm text-muted-foreground">Line {resolved.line}</span>
        )}
      </div>
      <span className="text-sm text-muted-foreground">{fix}</span>
    </>
  );
}

interface FindingProps {
  resolved: Pick<ResolvedFinding, 'label' | 'line'>;
  source: Snapshot['findings'][number]['source'];
  fix: string;
}

export function AnalysisReport({
  report,
  resumeJson,
  onOpenField,
}: {
  report: Snapshot;
  resumeJson: unknown;
  onOpenField: (target: ResolvedFinding) => void;
}) {
  const groups = groupFindings(report, resumeJson);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums">{report.score}</span>
        <span className="text-muted-foreground">/ 100</span>
      </div>

      {groups.length === 0 ? (
        <span className="text-muted-foreground">No issues found.</span>
      ) : (
        groups.map((group) => (
          <section key={group.sectionId} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{group.title}</h3>
            {group.findings.map(({ finding, resolved }, index) => {
              const key = `${finding.source}-${finding.section_id}-${finding.issue}-${index}`;

              if (!resolved) {
                return (
                  <div key={key} className="flex flex-col gap-1 rounded-lg border p-4">
                    <FindingBody
                      resolved={{ label: ISSUE_LABELS[finding.issue], line: undefined }}
                      source={finding.source}
                      fix={finding.fix}
                    />
                  </div>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOpenField(resolved)}
                  className="group flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <FindingBody resolved={resolved} source={finding.source} fix={finding.fix} />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                    Edit in resume <ArrowUpRight className="size-3" />
                  </span>
                </button>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
