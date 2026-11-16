import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { type IFinding, type IResumeAnalysisSnapshot, ISSUE_LABELS } from 'shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  countFindingsByFilter,
  filterFindingGroups,
  type FindingFilterType,
  type FindingSeverityType,
  getFindingSeverity,
  groupFindings,
} from '@/lib/resume-analysis';
import { type IResolvedFinding } from '@/lib/resume-lint';

interface IFindingFilterChip {
  id: FindingFilterType;
  label: string;
}

interface IFindingProps {
  resolved: Pick<IResolvedFinding, 'label' | 'line'>;
  source: IFinding['source'];
  severity: FindingSeverityType;
  fix: string;
}

const FILTER_CHIPS: readonly IFindingFilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'quick-fixes', label: 'Quick fixes' },
];

const SEVERITY_BADGES: Record<FindingSeverityType, { label: string; className?: string }> = {
  high: {
    label: 'High',
    className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  low: {
    label: 'Low',
  },
};

function FindingBody({ resolved, severity, fix }: IFindingProps) {
  const severityBadge = SEVERITY_BADGES[severity];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{resolved.label}</span>
        {resolved.line !== undefined && (
          <span className="text-sm text-muted-foreground">Line {resolved.line}</span>
        )}
        <Badge variant="secondary" className={severityBadge.className}>
          {severityBadge.label}
        </Badge>
      </div>
      <span className="text-sm text-muted-foreground">{fix}</span>
    </>
  );
}

export function AnalysisReport({
  report,
  resumeJson,
  usageLabel,
  onOpenField,
}: {
  report: IResumeAnalysisSnapshot;
  resumeJson: unknown;
  usageLabel?: string;
  onOpenField: (target: IResolvedFinding) => void;
}) {
  const [selectedFilter, setSelectedFilter] = useState<FindingFilterType>('all');

  const groups = groupFindings(report, resumeJson);
  const counts = countFindingsByFilter(report.findings);
  const activeFilter = counts[selectedFilter] > 0 ? selectedFilter : 'all';
  const filteredGroups = filterFindingGroups(groups, activeFilter);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-semibold tabular-nums">{report.score}</span>
          <span className="text-muted-foreground">/ 100</span>
        </div>
        {usageLabel && <span className="text-sm text-muted-foreground">{usageLabel}</span>}
      </div>

      {groups.length === 0 ? (
        <span className="text-muted-foreground">No issues found.</span>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter findings"
            className="flex flex-wrap items-center gap-2"
          >
            {FILTER_CHIPS.map(({ id, label }) => {
              const count = counts[id];
              const isActive = activeFilter === id;

              if (!count) {
                return null;
              }

              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'secondary' : 'outline'}
                  aria-pressed={isActive}
                  onClick={() => setSelectedFilter(isActive && id !== 'all' ? 'all' : id)}
                >
                  <span>{label}</span>
                  <span
                    className={
                      isActive
                        ? 'text-xs text-primary-foreground/80 tabular-nums'
                        : 'text-xs text-muted-foreground tabular-nums'
                    }
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          {filteredGroups.map((group) => (
            <section key={group.sectionId} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{group.title}</h3>
              {group.findings.map(({ finding, resolved }, index) => {
                const key = `${finding.source}-${finding.section_id}-${finding.issue}-${index}`;
                const severity = getFindingSeverity(finding.issue);

                if (!resolved) {
                  return (
                    <div key={key} className="flex flex-col gap-1 rounded-lg border p-4">
                      <FindingBody
                        resolved={{ label: ISSUE_LABELS[finding.issue], line: undefined }}
                        source={finding.source}
                        severity={severity}
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
                    <FindingBody
                      resolved={resolved}
                      source={finding.source}
                      severity={severity}
                      fix={finding.fix}
                    />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                      Edit in resume <Icon icon={ArrowUpRight01Icon} className="size-3" />
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
