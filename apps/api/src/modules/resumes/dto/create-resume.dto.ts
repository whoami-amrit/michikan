import ResumeJsonSchema from '@common/types/resume.interface';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  json: ResumeJsonSchema,
  name: z.string().min(1, 'Resume name is required'),
  description: z.string().optional(),
});

export class CreateResumeRequestDto extends createZodDto(schema) {}

export default schema;
