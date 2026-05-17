import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export class LoginRequestDto extends createZodDto(schema) {}

export default schema;
