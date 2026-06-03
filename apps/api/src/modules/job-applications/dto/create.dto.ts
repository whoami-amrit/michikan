import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const schema = z.object({
  jobDescription: z.string().nonempty().max(10000),
  resumeId: z.number().nonnegative(),
});

export class CreateJobApplicationDto extends createZodDto(schema) {}

export default schema;
