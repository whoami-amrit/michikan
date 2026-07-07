import aiConfig, { type IAIConfig } from '@config/ai.config';
import { GoogleGenAI } from '@google/genai';
import { Inject, Injectable, Logger } from '@nestjs/common';
import z, { ZodType } from 'zod';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiService: GoogleGenAI;

  constructor(@Inject(aiConfig.KEY) private readonly config: IAIConfig) {
    this.aiService = new GoogleGenAI({
      apiKey: this.config.geminiApiKey,
    });
  }

  async execute<T>(prompt: string, zodSchema: ZodType<T>) {
    try {
      const response = await this.aiService.interactions.create({
        model: 'gemini-2.5-flash-lite',
        input: prompt,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: z.toJSONSchema(zodSchema),
        },
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 2000,
        },
      });

      if (!response.output_text) {
        this.logger.error('AI response text is empty');
        return null;
      }

      const parsedJson = JSON.parse(response.output_text) as unknown;
      const validatedData = zodSchema.safeParse(parsedJson);

      if (!validatedData.success) {
        this.logger.error('AI response validation failed', validatedData.error);
        return null;
      }

      return validatedData.data;
    } catch (error) {
      this.logger.error(
        `Error executing AI analysis: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }
}
