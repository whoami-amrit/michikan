import ResumeJsonSchema from '@common/types/resume.interface';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  json: ResumeJsonSchema.optional(),
});

export class UpdateResumeDto extends createZodDto(schema) {}

export default schema;
