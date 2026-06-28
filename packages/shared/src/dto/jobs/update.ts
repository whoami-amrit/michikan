import { JobStatus } from 'db';
import z from 'zod';

import { zodSafeString } from '../../common.zod';
import { applicationUrlSchema, companyNameSchema, jobTitleSchema, notesSchema } from './common';

const schema = z.object({
  status: zodSafeString.pipe(z.enum(JobStatus).optional()),
  notes: notesSchema,
  company: zodSafeString.pipe(companyNameSchema.optional()),
  title: zodSafeString.pipe(jobTitleSchema.optional()),
  applicationUrl: applicationUrlSchema,
});

export type IUpdateJobDto = z.infer<typeof schema>;
export type IUpdateJobDtoInput = z.input<typeof schema>;

export default schema;
