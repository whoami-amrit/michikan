import { JobStatus } from 'db';
import z from 'zod';

const schema = z.object({
  status: z.enum(JobStatus),
  saved: z.literal(true, 'Operation not allowed, delete resource instead').optional(),
});

export type IUpdateJobStatusDto = z.infer<typeof schema>;

export default schema;
