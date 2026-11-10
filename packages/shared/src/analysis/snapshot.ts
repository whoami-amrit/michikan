import z from 'zod';

import { LLM_ISSUE_CODES } from './types';

export const findingSchema = z.object({
  source: z.enum(['linter', 'llm']),
  section_id: z.string(),
  issue: z.enum(LLM_ISSUE_CODES),
  fix: z.string(),
});

export const resumeAnalysisSnapshotSchema = z.object({
  version: z.literal(1),
  score: z.number().int().min(0).max(100),
  resumeJsonHash: z.string(),
  analysedAt: z.string(),
  idMap: z.record(z.string(), z.string()),
  findings: z.array(findingSchema),
});

export type ResumeAnalysisSnapshot = z.infer<typeof resumeAnalysisSnapshotSchema>;
