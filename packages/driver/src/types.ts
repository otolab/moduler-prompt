import type { CompiledPrompt } from '@moduler-prompt/core';
import type { FormatterOptions } from './formatter/index.js';

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
 * Special token definition
 */
export interface SpecialToken {
  text: string;
  id: number;
}

/**
 * Special token pair definition
 */
export interface SpecialTokenPair {
  start: SpecialToken;
  end: SpecialToken;
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
   * Get formatter options for this driver
   * Drivers can dynamically determine their formatting needs
   */
  getFormatterOptions(): FormatterOptions;
  
  /**
   * Get special tokens for this model (optional)
   * Returns model-specific special tokens for formatting
   */
  getSpecialTokens?(): Promise<Record<string, SpecialToken | SpecialTokenPair> | null>;
  
  /**
   * Whether to prefer message format over text format
   * Default is false (use text format)
   */
  preferMessageFormat?: boolean;
  
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