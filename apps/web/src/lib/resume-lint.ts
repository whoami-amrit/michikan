import { createContext, useContext, useMemo } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  buildIdMap,
  type ICreateResumeDto,
  type ICreateResumeDtoInput,
  type IFinding,
  type IResumeJson,
  ISSUE_LABELS,
  type JsonPathType,
  lintResume,
  type SectionIdType,
} from 'shared';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

export const LINT_DEBOUNCE_MS = 300;

export type ResumeTabType = keyof IResumeJson;

export interface IResolvedFinding {
  finding: IFinding;
  label: string;
  fieldName: string;
  anchorId: string;
  tab: ResumeTabType;
  line?: number;
}

export const resumeFieldId = (fieldName: string) => `resume-field-${fieldName.replace(/\./g, '-')}`;

const HIGHLIGHTS_PATH_REGEX = /^(experience|projects)\[(\d+)\]\.highlights$/;

export function resolveFinding(
  finding: IFinding,
  idMap: Readonly<Record<SectionIdType, JsonPathType>>,
  json: ICreateResumeDtoInput['json'] | undefined,
): IResolvedFinding | undefined {
  const path = idMap[finding.section_id];
  if (!path) {
    return undefined;
  }

  const [base = '', lineIndex] = path.split('#');
  let fieldName = `json.${base.replace(/\[(\d+)\]/g, '.$1')}`;

  if (base === 'personalInfo') {
    fieldName += '.email';
  } else if (/^projects\[\d+\]$/.test(base)) {
    fieldName += '.title';
  }

  const resolved: IResolvedFinding = {
    finding,
    label: ISSUE_LABELS[finding.issue],
    fieldName,
    anchorId: resumeFieldId(fieldName),
    tab: base.split(/[[.]/)[0] as ResumeTabType,
  };

  const highlights = HIGHLIGHTS_PATH_REGEX.exec(base);
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
    if (lines[i]?.trim()) {
      kept++;
    }
    if (kept === keptIndex) {
      return i + 1;
    }
  }
  return keptIndex + 1;
}

export type ResumeLintFindingsType = ReadonlyMap<string, readonly IResolvedFinding[]>;

const noFindingsByAnchorIdMap: ResumeLintFindingsType = new Map();

export function useResumeLint(
  control: Control<ICreateResumeDtoInput, unknown, ICreateResumeDto>,
): ResumeLintFindingsType {
  const json = useWatch({ control, name: 'json' });
  const debounced = useDebouncedValue(json, LINT_DEBOUNCE_MS);

  return useMemo(() => {
    if (!debounced) {
      return noFindingsByAnchorIdMap;
    }

    const idMap = buildIdMap(debounced);
    const findingsByAnchorIdMap = new Map<string, IResolvedFinding[]>();

    for (const finding of lintResume(debounced)) {
      const resolved = resolveFinding(finding, idMap, debounced);
      if (!resolved) {
        continue;
      }

      const list = findingsByAnchorIdMap.get(resolved.anchorId);
      if (list) {
        list.push(resolved);
      } else {
        findingsByAnchorIdMap.set(resolved.anchorId, [resolved]);
      }
    }

    return findingsByAnchorIdMap;
  }, [debounced]);
}

export const resumeLintContext = createContext<ResumeLintFindingsType>(noFindingsByAnchorIdMap);

export const useFieldLintFindings = (fieldName: string): readonly IResolvedFinding[] =>
  useContext(resumeLintContext).get(resumeFieldId(fieldName)) ?? [];

export interface IResumeJumpTarget {
  tab: ResumeTabType;
  anchorId: string;
  line?: number;
}

export function selectTextareaLine(textarea: HTMLTextAreaElement, line: number): void {
  const lines = textarea.value.split('\n');
  const text = lines[line - 1];
  if (text === undefined) {
    return;
  }

  const start = lines
    .slice(0, line - 1)
    .reduce((offset, current) => offset + current.length + 1, 0);
  textarea.setSelectionRange(start, start + text.replace(/\r$/, '').length);
}
