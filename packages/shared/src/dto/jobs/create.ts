import { JobStatus } from 'db';
import z from 'zod';

import { applicationUrlSchema, companyNameSchema, jobTitleSchema, notesSchema } from './common';

const schema = z.object({
  jobDescription: z.string().nonempty('Job description must not be empty').max(10000),
  title: jobTitleSchema,
  company: companyNameSchema,
  applicationUrl: applicationUrlSchema,
  status: z.enum(JobStatus),
  notes: notesSchema,
  shouldAnalyzeOptions: z
    .object({
      should: z.boolean().default(false),
      resumeId: z.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.should && data.resumeId === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['resumeId'],
          message: 'Resume ID is required if job analysis is selected',
        });
      }
    }),
});

export type ICreateJobDto = z.infer<typeof schema>;
export type ICreateJobDtoInput = z.input<typeof schema>;

export default schema;
