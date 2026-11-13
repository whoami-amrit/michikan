import type { ILlmFeedback } from './schema';
import type { IFinding } from './snapshot';
import { LLM_ISSUE_CODES, type LlmIssueCodeType, type SectionIdType } from './types';

export const MAX_LLM_FINDINGS = 10;

const PRIORITY: Record<LlmIssueCodeType, number> = Object.fromEntries(
  LLM_ISSUE_CODES.map((code, index) => [code, index]),
) as Record<LlmIssueCodeType, number>;

const SK_MULTI_CODES: ReadonlySet<string> = new Set<LlmIssueCodeType>([
  'HIDDEN_SKILL',
  'ORPHAN_SKILL',
  'TECH_CASING',
]);

export function postProcessLlmFindings(
  raw: ILlmFeedback,
  idMap: Readonly<Record<SectionIdType, string>>,
): IFinding[] {
  const sectionOrderMap = new Map(Object.keys(idMap).map((id, index) => [id, index]));

  const bestFeedbackByKeyMap = new Map<string, ILlmFeedback['feedback'][number]>();
  for (const item of raw.feedback) {
    if (item.section_id === 'PI' || !sectionOrderMap.has(item.section_id)) {
      continue;
    }

    const key =
      item.section_id === 'SK' && SK_MULTI_CODES.has(item.issue)
        ? `SK:${item.issue}`
        : item.section_id;
    const current = bestFeedbackByKeyMap.get(key);
    if (!current || PRIORITY[item.issue] < PRIORITY[current.issue]) {
      bestFeedbackByKeyMap.set(key, item);
    }
  }

  return [...bestFeedbackByKeyMap.values()]
    .sort(
      (a, b) =>
        PRIORITY[a.issue] - PRIORITY[b.issue] ||
        sectionOrderMap.get(a.section_id)! - sectionOrderMap.get(b.section_id)!,
    )
    .slice(0, MAX_LLM_FINDINGS)
    .map((item) => ({
      source: 'llm' as const,
      section_id: item.section_id,
      issue: item.issue,
      fix: item.fix,
    }));
}
