import z from 'zod';

import { LLM_ISSUE_CODES } from './types';

export const RESUME_FEEDBACK_SCHEMA_NAME = 'resume_feedback';

export const llmFeedbackSchema = z.object({
  feedback: z.array(
    z.object({
      section_id: z.string(),
      issue: z.enum(LLM_ISSUE_CODES),
      fix: z.string(),
    }),
  ),
});

const feedbackJsonSchema = z.toJSONSchema(llmFeedbackSchema);
delete feedbackJsonSchema.$schema;

export const RESUME_FEEDBACK_JSON_SCHEMA = Object.freeze(feedbackJsonSchema);

export type LlmFeedback = z.infer<typeof llmFeedbackSchema>;
