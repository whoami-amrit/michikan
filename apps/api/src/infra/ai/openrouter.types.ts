export interface IOpenRouterMessage {
  role: 'system' | 'user';
  content: string;
}

export interface IOpenRouterRequest {
  model: string;
  messages: IOpenRouterMessage[];
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

export interface IOpenRouterErrorBody {
  code?: number | string;
  message?: string;
}

export interface IOpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
  cost?: number | null;
}

export interface IOpenRouterChoice {
  finish_reason?: string | null;
  message?: { content?: string | null };
  error?: IOpenRouterErrorBody;
}

export interface IOpenRouterResponse {
  id?: string;
  choices?: IOpenRouterChoice[];
  usage?: IOpenRouterUsage;
  error?: IOpenRouterErrorBody;
}
