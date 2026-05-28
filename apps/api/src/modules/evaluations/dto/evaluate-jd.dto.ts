import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const evaluateJDRelevanceBodySchema = z.object({
  jd: z.string().max(10000),
});

export class EvaluateJDRelevanceBodyDto extends createZodDto(evaluateJDRelevanceBodySchema) {}
