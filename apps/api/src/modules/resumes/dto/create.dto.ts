import ResumeJsonSchema from '@common/types/resume.interface';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  json: ResumeJsonSchema,
  name: z.string().min(1, 'Resume name is required').max(50),
  description: z.string().max(200).optional(),
});

export class CreateResumeDto extends createZodDto(schema) {}

export default schema;
