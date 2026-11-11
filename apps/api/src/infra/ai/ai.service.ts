import aiConfig, { type IAIConfig } from '@config/ai.config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { AiFatalError, AiRetryableError } from './ai.errors';
import type {
  OpenRouterErrorBody,
  OpenRouterRequest,
  OpenRouterResponse,
} from './openrouter.types';

export const AI_MODEL = 'openai/gpt-4o-mini';
export const AI_TIMEOUT_MS = 30_000;
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AiUsage {
  generationId: string;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  cost: number | null;
  latencyMs: number;
}

export interface GenerateJsonArgs<T> {
  system: string;
  user: string;
  schemaName: string;
  jsonSchema: object;
  zodSchema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(aiConfig.KEY) private readonly config: IAIConfig) {}

  async generateJson<T>(args: GenerateJsonArgs<T>): Promise<{ data: T; usage: AiUsage }> {
    const body: OpenRouterRequest = {
      model: AI_MODEL,
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: args.schemaName, strict: true, schema: args.jsonSchema },
      },
      temperature: args.temperature ?? 0,
      max_tokens: args.maxTokens ?? 1000,
      provider: {
        order: ['openai'],
        allow_fallbacks: false,
        require_parameters: true,
        data_collection: 'deny',
      },
    };

    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.appUrl,
          'X-OpenRouter-Title': 'Michikan',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
      this.logger.error(`OpenRouter request failed before a response: ${message}`);
      throw new AiRetryableError(`OpenRouter request failed: ${message}`, 'provider');
    }

    const parsedBody = await this.readBody(response);

    if (!response.ok) {
      throw this.classifyHttpError(response.status, parsedBody);
    }

    return this.handleSuccess(parsedBody, args.zodSchema, Date.now() - startedAt);
  }

  private async readBody(response: Response): Promise<OpenRouterResponse | null> {
    try {
      return (await response.json()) as OpenRouterResponse;
    } catch {
      return null;
    }
  }

  private classifyHttpError(status: number, body: OpenRouterResponse | null) {
    const generationId = body?.id;
    this.logError(status, body?.error, generationId);
    const message = `OpenRouter responded with HTTP ${status}`;

    if (status === 402) {
      return new AiFatalError(message, 'credits', generationId);
    }
    if (status === 408 || status === 429 || status >= 500) {
      return new AiRetryableError(message, 'provider', generationId);
    }
    if (status >= 400) {
      return new AiFatalError(message, 'client', generationId);
    }
    return new AiRetryableError(message, 'provider', generationId);
  }

  private handleSuccess<T>(
    body: OpenRouterResponse | null,
    zodSchema: z.ZodType<T>,
    latencyMs: number,
  ): { data: T; usage: AiUsage } {
    const generationId = body?.id;
    const choice = body?.choices?.[0];

    if (!body || !choice) {
      this.logError(200, body?.error, generationId);
      throw new AiRetryableError('OpenRouter returned no choices', 'output', generationId);
    }

    if (choice.error) {
      this.logError(200, choice.error, generationId);
      throw new AiRetryableError('OpenRouter choice carried an error', 'output', generationId);
    }

    switch (choice.finish_reason) {
      case 'content_filter':
        this.logger.error(`Provider content filter triggered (generationId=${generationId})`);
        throw new AiFatalError('Provider content filter triggered', 'content_filter', generationId);
      case 'length':
        this.logger.error(`Output truncated at max_tokens (generationId=${generationId})`);
        throw new AiRetryableError('Output truncated at max_tokens', 'output', generationId);
    }

    const content = choice.message?.content;
    if (!content) {
      this.logger.error(`Provider returned empty content (generationId=${generationId})`);
      throw new AiRetryableError('Provider returned empty content', 'output', generationId);
    }

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      this.logger.error(`Provider output is not valid JSON (generationId=${generationId})`);
      throw new AiRetryableError('Provider output is not valid JSON', 'output', generationId);
    }

    const result = zodSchema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}:${i.code}`).join(', ');
      this.logger.error(
        `Provider output failed schema validation (generationId=${generationId}): ${issues}`,
      );
      throw new AiRetryableError(
        'Provider output failed schema validation',
        'output',
        generationId,
      );
    }

    const usage: AiUsage = {
      generationId: generationId ?? '',
      promptTokens: body.usage?.prompt_tokens ?? 0,
      cachedTokens: body.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
      cost: body.usage?.cost ?? null,
      latencyMs,
    };

    this.logger.log(
      `AI call succeeded generationId=${usage.generationId} promptTokens=${usage.promptTokens} ` +
        `cachedTokens=${usage.cachedTokens} completionTokens=${usage.completionTokens} ` +
        `cost=${usage.cost ?? 'null'} latencyMs=${usage.latencyMs}`,
    );

    return { data: result.data, usage };
  }

  private logError(status: number, error: OpenRouterErrorBody | undefined, generationId?: string) {
    this.logger.error(
      `OpenRouter error status=${status} code=${error?.code ?? 'n/a'} ` +
        `message=${error?.message ?? 'n/a'} generationId=${generationId ?? 'n/a'}`,
    );
  }
}
