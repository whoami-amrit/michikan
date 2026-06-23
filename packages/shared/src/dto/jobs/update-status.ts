import { JobStatus } from 'db';
import z from 'zod';

const schema = z.object({
  status: z.enum(JobStatus),
});

export type IUpdateJobStatusDto = z.infer<typeof schema>;

export default schema;
