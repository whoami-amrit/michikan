import z from 'zod';

import { LLM_ISSUE_CODES } from './types';

export const RESUME_FEEDBACK_SCHEMA_NAME = 'resume_feedback';

export const RESUME_FEEDBACK_JSON_SCHEMA = Object.freeze({
  type: 'object',
  properties: Object.freeze({
    feedback: Object.freeze({
      type: 'array',
      items: Object.freeze({
        type: 'object',
        properties: Object.freeze({
          section_id: Object.freeze({ type: 'string' }),
          issue: Object.freeze({
            type: 'string',
            enum: Object.freeze([
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
            ]),
          }),
          fix: Object.freeze({ type: 'string' }),
        }),
        required: Object.freeze(['section_id', 'issue', 'fix']),
        additionalProperties: false,
      }),
    }),
  }),
  required: Object.freeze(['feedback']),
  additionalProperties: false,
});

export const llmFeedbackSchema = z.object({
  feedback: z.array(
    z.object({
      section_id: z.string(),
      issue: z.enum(LLM_ISSUE_CODES),
      fix: z.string(),
    }),
  ),
});

export type LlmFeedback = z.infer<typeof llmFeedbackSchema>;
