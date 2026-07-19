import aiConfig, { type IAIConfig } from '@config/ai.config';
import { GoogleGenAI } from '@google/genai';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiService: GoogleGenAI;

  constructor(@Inject(aiConfig.KEY) private readonly config: IAIConfig) {
    this.aiService = new GoogleGenAI({
      apiKey: this.config.geminiApiKey,
    });
  }

  async execute(prompt: string) {
    this.logger.debug(prompt);

    const response = await this.aiService.interactions.create({
      model: 'gemini-2.5-flash-lite',
      input: prompt,
      store: false,
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 2000,
      },
    });

    if (!response.output_text) {
      this.logger.error('AI response text is empty');
      throw new Error('No output text was generated');
    }

    return response.output_text;
  }
}
