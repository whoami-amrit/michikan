import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  resumeId: z.number().int('Resume ID must be an integer').min(1, 'Resume ID must be at least 1'),
});

export class UpdateActiveResumeRequestDto extends createZodDto(schema) {}

export default schema;
