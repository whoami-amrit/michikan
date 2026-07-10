import { JobStatus } from 'db';
import z from 'zod';

import { zodSafeString } from '../../common.zod';
import { applicationUrlSchema, notesSchema } from './common';

const schema = z.object({
  status: zodSafeString.pipe(z.enum(JobStatus).optional()),
  notes: notesSchema,
  applyLink: applicationUrlSchema,
  submittedResumeId: z.number().nonnegative().optional(),
});

export type IUpdateJobDto = z.infer<typeof schema>;
export type IUpdateJobDtoInput = z.input<typeof schema>;

export default schema;
