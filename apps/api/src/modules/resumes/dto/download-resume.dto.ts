import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['pdf']),
});

export type IResumeDownloadDto = z.infer<typeof schema>;

export class ResumeDownloadDto extends createZodDto(schema) {}

export default schema;
