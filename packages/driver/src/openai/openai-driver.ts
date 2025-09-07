import OpenAI from 'openai';
import { BaseDriver } from '../base/base-driver.js';
import type { ChatMessage } from '@moduler-prompt/utils';
import type { QueryOptions, QueryResult } from '../types.js';
import type { 
  ChatCompletionCreateParams,
  ChatCompletionMessageParam 
} from 'openai/resources/index.mjs';

/**
 * OpenAI driver configuration
 */
export interface OpenAIDriverConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  organization?: string;
  defaultOptions?: Partial<OpenAIQueryOptions>;
}

/**
 * OpenAI-specific query options
 */
export interface OpenAIQueryOptions extends QueryOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  logprobs?: boolean;
  topLogprobs?: number;
  responseFormat?: { type: 'json_object' | 'text' };
  seed?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

/**
 * OpenAI API driver
 */
export class OpenAIDriver extends BaseDriver {
  private client: OpenAI;
  private defaultModel: string;
  private defaultOptions: Partial<OpenAIQueryOptions>;
  
  constructor(config: OpenAIDriverConfig = {}) {
    super();
    
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL,
      organization: config.organization
    });
    
    this.defaultModel = config.model || 'gpt-4o-mini';
    this.defaultOptions = config.defaultOptions || {};
    this.preferMessageFormat = true; // OpenAI uses message format
  }
  
  /**
   * Convert our ChatMessage to OpenAI's message format
   */
  private convertMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
    return messages.map(msg => {
      // Map our roles to OpenAI roles
      const role = msg.role === 'system' ? 'system' 
                 : msg.role === 'user' ? 'user'
                 : 'assistant';
      
      return {
        role,
        content: msg.content
      } as ChatCompletionMessageParam;
    });
  }
  
  /**
   * Query with messages
   */
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options: OpenAIQueryOptions = {}
  ): Promise<QueryResult> {
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Build request parameters
      const params: ChatCompletionCreateParams = {
        model: mergedOptions.model || this.defaultModel,
        messages: this.convertMessages(messages),
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        top_p: mergedOptions.topP,
        frequency_penalty: mergedOptions.frequencyPenalty,
        presence_penalty: mergedOptions.presencePenalty,
        stop: mergedOptions.stop,
        n: mergedOptions.n,
        logprobs: mergedOptions.logprobs,
        top_logprobs: mergedOptions.topLogprobs,
        response_format: mergedOptions.responseFormat,
        seed: mergedOptions.seed,
        tools: mergedOptions.tools,
        tool_choice: mergedOptions.toolChoice,
        stream: false
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === undefined) {
          delete params[key as keyof typeof params];
        }
      });
      
      // Make the API call
      const response = await this.client.chat.completions.create(params);
      const choice = response.choices[0];
      
      // Map finish reason
      let finishReason: QueryResult['finishReason'] = 'stop';
      if (choice.finish_reason === 'length') {
        finishReason = 'length';
      } else if (choice.finish_reason === 'content_filter') {
        finishReason = 'error';
      }
      
      return {
        content: choice.message?.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined,
        finishReason
      };
    } catch (error) {
      return {
        content: '',
        finishReason: 'error'
      };
    }
  }
  
  /**
   * Stream query implementation
   */
  async *streamQuery(
    prompt: import('@moduler-prompt/core').CompiledPrompt, 
    options?: OpenAIQueryOptions
  ): AsyncIterable<string> {
    const messages = this.preferMessageFormat 
      ? this.convertMessages(formatPromptAsMessages(prompt, this.getFormatterOptions()))
      : [{ role: 'system' as const, content: formatPrompt(prompt, this.getFormatterOptions()) }];
    
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const params: ChatCompletionCreateParams = {
      model: mergedOptions.model || this.defaultModel,
      messages: messages as ChatCompletionMessageParam[],
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.maxTokens,
      stream: true
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params] === undefined) {
        delete params[key as keyof typeof params];
      }
    });
    
    const stream = await this.client.chat.completions.create(params);
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
  
  /**
   * Close the client
   */
  async close(): Promise<void> {
    // OpenAI client doesn't need explicit closing
  }
}

// Re-import for proper typing
import { formatPrompt, formatPromptAsMessages } from '@moduler-prompt/utils';