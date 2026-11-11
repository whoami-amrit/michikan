import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  buildIdMap,
  type Finding,
  type ICreateResumeDto,
  type ICreateResumeDtoInput,
  type IResumeJson,
  ISSUE_LABELS,
  type JsonPath,
  lintResume,
  type SectionId,
} from 'shared';

export const LINT_DEBOUNCE_MS = 300;

export type ResumeTab = keyof IResumeJson;

export interface ResolvedFinding {
  finding: Finding;
  label: string;
  fieldName: string;
  anchorId: string;
  tab: ResumeTab;
  line?: number;
}

export const resumeFieldId = (fieldName: string) => `resume-field-${fieldName.replace(/\./g, '-')}`;

const HIGHLIGHTS_PATH = /^(experience|projects)\[(\d+)\]\.highlights$/;

export function resolveFinding(
  finding: Finding,
  idMap: Readonly<Record<SectionId, JsonPath>>,
  json: ICreateResumeDtoInput['json'] | undefined,
): ResolvedFinding | undefined {
  const path = idMap[finding.section_id];
  if (!path) return undefined;

  const [base = '', lineIndex] = path.split('#');
  let fieldName = `json.${base.replace(/\[(\d+)\]/g, '.$1')}`;

  if (base === 'personalInfo') fieldName += '.email';
  else if (/^projects\[\d+\]$/.test(base)) fieldName += '.title';

  const resolved: ResolvedFinding = {
    finding,
    label: ISSUE_LABELS[finding.issue],
    fieldName,
    anchorId: resumeFieldId(fieldName),
    tab: base.split(/[[.]/)[0] as ResumeTab,
  };

  const highlights = HIGHLIGHTS_PATH.exec(base);
  if (highlights && lineIndex !== undefined) {
    const [, section, index] = highlights;
    const text = json?.[section as 'experience' | 'projects']?.[Number(index)]?.highlights;
    resolved.line = textareaLine(text, Number(lineIndex));
  }

  return resolved;
}

function textareaLine(text: string | undefined, keptIndex: number): number {
  let kept = -1;
  const lines = (text ?? '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim()) kept++;
    if (kept === keptIndex) return i + 1;
  }
  return keptIndex + 1;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export type ResumeLintFindings = ReadonlyMap<string, readonly ResolvedFinding[]>;

const EMPTY: ResumeLintFindings = new Map();

export function useResumeLint(
  control: Control<ICreateResumeDtoInput, unknown, ICreateResumeDto>,
): ResumeLintFindings {
  const json = useWatch({ control, name: 'json' });
  const debounced = useDebouncedValue(json, LINT_DEBOUNCE_MS);

  return useMemo(() => {
    if (!debounced) return EMPTY;

    const idMap = buildIdMap(debounced);
    const byAnchor = new Map<string, ResolvedFinding[]>();

    for (const finding of lintResume(debounced)) {
      const resolved = resolveFinding(finding, idMap, debounced);
      if (!resolved) continue;

      const list = byAnchor.get(resolved.anchorId);
      if (list) list.push(resolved);
      else byAnchor.set(resolved.anchorId, [resolved]);
    }

    return byAnchor;
  }, [debounced]);
}

export const resumeLintContext = createContext<ResumeLintFindings>(EMPTY);

export const useFieldLintFindings = (fieldName: string): readonly ResolvedFinding[] =>
  useContext(resumeLintContext).get(resumeFieldId(fieldName)) ?? [];
