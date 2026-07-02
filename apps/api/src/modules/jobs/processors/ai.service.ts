import { Injectable, Logger } from '@nestjs/common';
import ky from 'ky';
import z, { ZodType } from 'zod';

const aiService = ky.create({
  prefix: 'ai/api',
  keepalive: true,
});

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async execute<T>(prompt: string, zodSchema: ZodType<T>): Promise<T | null> {
    try {
      const response = await aiService.get('generate', {
        body: JSON.stringify({ prompt, model: 'qwen3.5:0.8b', format: z.toJSONSchema(zodSchema) }),
      });

      if (!response.text) {
        throw new Error('No response text received from Gemini API');
      }

      const result = zodSchema.safeParse({});

      if (result.success) {
        return result.data;
      }

      this.logger.error(
        `Failed to parse Gemini API response: ${JSON.stringify(z.flattenError(result.error))}`,
      );

      return null;
    } catch (error) {
      this.logger.error(
        `Error executing AI analysis: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }
}
