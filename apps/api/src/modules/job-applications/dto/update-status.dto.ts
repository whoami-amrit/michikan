import { JobApplicationStatus } from '@db/enums';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const schema = z.object({
  status: z.enum(JobApplicationStatus),
  saved: z.literal(true, 'Operation not allowed, delete resource instead').optional(),
});

export class UpdateJobApplicationStatusDto extends createZodDto(schema) {}

export default schema;
