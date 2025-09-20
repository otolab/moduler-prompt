import type { FormatterOptions } from './formatter/types.js';

// Re-export from core for convenience
export type { CompiledPrompt } from '@moduler-prompt/core';

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
  /**
   * Raw text response from the model
   */
  content: string;

  /**
   * Structured outputs extracted from the response
   * - undefined: no schema was specified
   * - []: schema was specified but no valid JSON found
   * - [...]: extracted JSON objects/arrays
   */
  structuredOutputs?: unknown[];

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
 * Stream result with both stream and final result
 */
export interface StreamResult {
  /**
   * Async iterable stream of response chunks
   */
  stream: AsyncIterable<string>;

  /**
   * Promise that resolves to the final query result
   */
  result: Promise<QueryResult>;
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
   * Stream query with both stream and result (optional)
   */
  streamQuery?(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult>;

  /**
   * Close the driver connection (optional)
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