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

export const LINT_ISSUE_CODES = [
  'PRONOUN',
  'TRAILING_PERIOD',
  'SYMBOL',
  'SPELLED_NUMBER',
  'WEAK_VERB',
  'OVERWROUGHT_VERB',
  'BANNED_VERB',
  'B_WORD',
  'LONG_BULLET',
  'LEGACY_EMAIL',
  'SKILL_AMALGAM',
  'SKILL_PROFICIENCY',
  'SOFT_SKILL',
  'BASIC_SKILL',
  'GITHUB_AS_SKILL',
  'PROJECT_IN_TITLE',
] as const;

export type LintIssueCode = (typeof LINT_ISSUE_CODES)[number];

export const ISSUE_CODES = [...LLM_ISSUE_CODES, ...LINT_ISSUE_CODES] as const;

export type FindingSource = 'linter' | 'llm';

export type FindingIssueCode = LlmIssueCode | LintIssueCode;

export interface Finding {
  source: FindingSource;
  section_id: SectionId;
  issue: FindingIssueCode;
  fix: string;
}
