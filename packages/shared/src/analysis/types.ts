export type SectionId = string;

export type JsonPath = string;

export const LLM_ISSUE_CODES = [
  'PII',
  'UNPAID_AS_WORK',
  'UNJUSTIFIED_SUMMARY',
  'NO_RESULT',
  'VAGUE_CLAIM',
  'WEAK_OWNERSHIP',
  'TOOL_CENTRIC',
  'HIDDEN_SKILL',
  'ORPHAN_SKILL',
  'TECH_CASING',
] as const;

export type LlmIssueCode = (typeof LLM_ISSUE_CODES)[number];

export type FindingSource = 'linter' | 'llm';

export type FindingIssueCode = LlmIssueCode;

export interface Finding {
  source: FindingSource;
  section_id: SectionId;
  issue: FindingIssueCode;
  fix: string;
}
