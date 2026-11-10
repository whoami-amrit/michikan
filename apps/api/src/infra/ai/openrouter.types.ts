export interface OpenRouterMessage {
  role: 'system' | 'user';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  response_format: {
    type: 'json_schema';
    json_schema: { name: string; strict: true; schema: object };
  };
  temperature: number;
  max_tokens: number;
  provider: {
    order: string[];
    allow_fallbacks: boolean;
    require_parameters: boolean;
    data_collection: 'allow' | 'deny';
  };
}

export interface OpenRouterErrorBody {
  code?: number | string;
  message?: string;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
  cost?: number | null;
}

export interface OpenRouterChoice {
  finish_reason?: string | null;
  message?: { content?: string | null };
  error?: OpenRouterErrorBody;
}

export interface OpenRouterResponse {
  id?: string;
  choices?: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  error?: OpenRouterErrorBody;
}
