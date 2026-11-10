import type { FindingIssueCode } from './types';

export const ISSUE_LABELS: Readonly<Record<FindingIssueCode, string>> = Object.freeze({
  PII: 'Personal information',
  UNPAID_AS_WORK: 'Unpaid activity listed as work',
  UNJUSTIFIED_SUMMARY: 'Summary not needed',
  NO_RESULT: 'No result stated',
  VAGUE_CLAIM: 'Vague claim',
  WEAK_OWNERSHIP: 'Unclear personal contribution',
  TOOL_CENTRIC: 'Focuses on the tool, not the problem',
  HIDDEN_SKILL: 'Skill missing from Skills',
  ORPHAN_SKILL: 'Skill never demonstrated',
  TECH_CASING: 'Technology name miscased',
});
