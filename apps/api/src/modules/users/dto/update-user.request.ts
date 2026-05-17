import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().max(255, 'Name must not exceed 255 characters').optional(),
  email: z.email('Invalid email address').optional(),
});

export class UpdateUserRequestDto extends createZodDto(schema) {}

export default schema;
