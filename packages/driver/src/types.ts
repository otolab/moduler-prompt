import type { Element, CompiledPrompt } from '@moduler-prompt/core';

/**
 * Chat message role
 */
export type Role = 'system' | 'assistant' | 'user';

/**
 * Chat message
 */
export interface ChatMessage {
  role: Role;
  content: string;
}

/**
 * Query result from AI model
 */
export interface QueryResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

/**
 * Options for querying AI model
 */
export interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

/**
 * AI Driver interface for executing prompts
 */
export interface AIDriver {
  /**
   * Query the AI model with a compiled prompt
   */
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  
  /**
   * Stream query (optional)
   */
  streamQuery?(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>;
  
  /**
   * Close the driver connection
   */
  close?(): Promise<void>;
}

/**
 * Driver configuration
 */
export interface DriverConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'test';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  defaultOptions?: QueryOptions;
}