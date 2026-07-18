import { JobStatus } from 'db';
import z from 'zod';

import { applicationUrlSchema, companyNameSchema, jobTitleSchema, notesSchema } from './common';

const schema = z.object({
  jobDescription: z.string().nonempty('Job description must not be empty').max(10000),
  role: jobTitleSchema,
  company: companyNameSchema,
  applyLink: applicationUrlSchema,
  status: z.enum(JobStatus),
  source: z.string(),
  submittedResumeId: z.number().nonnegative().nullable().optional(),
  notes: notesSchema,
});

export type ICreateJobDto = z.infer<typeof schema>;
export type ICreateJobDtoInput = z.input<typeof schema>;

export default schema;
