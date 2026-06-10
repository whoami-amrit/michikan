import { JobApplicationStatus } from '@michikan/db';
import z from 'zod';

const schema = z.object({
  status: z.enum(JobApplicationStatus),
  saved: z.literal(true, 'Operation not allowed, delete resource instead').optional(),
});

export type IUpdateJobApplicationStatusDto = z.infer<typeof schema>;

export default schema;
