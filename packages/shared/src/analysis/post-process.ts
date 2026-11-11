import type { LlmFeedback } from './schema';
import { type Finding, LLM_ISSUE_CODES, type LlmIssueCode, type SectionId } from './types';

export const MAX_LLM_FINDINGS = 10;

const PRIORITY: Record<LlmIssueCode, number> = Object.fromEntries(
  LLM_ISSUE_CODES.map((code, index) => [code, index]),
) as Record<LlmIssueCode, number>;

const SK_MULTI_CODES: ReadonlySet<string> = new Set<LlmIssueCode>([
  'HIDDEN_SKILL',
  'ORPHAN_SKILL',
  'TECH_CASING',
]);

export function postProcessLlmFindings(
  raw: LlmFeedback,
  idMap: Readonly<Record<SectionId, string>>,
): Finding[] {
  const appearance = new Map(Object.keys(idMap).map((id, index) => [id, index]));

  const best = new Map<string, LlmFeedback['feedback'][number]>();
  for (const item of raw.feedback) {
    if (item.section_id === 'PI' || !appearance.has(item.section_id)) {
      continue;
    }

    const key =
      item.section_id === 'SK' && SK_MULTI_CODES.has(item.issue)
        ? `SK:${item.issue}`
        : item.section_id;
    const current = best.get(key);
    if (!current || PRIORITY[item.issue] < PRIORITY[current.issue]) {
      best.set(key, item);
    }
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        PRIORITY[a.issue] - PRIORITY[b.issue] ||
        appearance.get(a.section_id)! - appearance.get(b.section_id)!,
    )
    .slice(0, MAX_LLM_FINDINGS)
    .map((item) => ({
      source: 'llm' as const,
      section_id: item.section_id,
      issue: item.issue,
      fix: item.fix,
    }));
}
