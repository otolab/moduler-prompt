import type { CompiledPrompt } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult } from './types.js';
import type { FormatterOptions } from './formatter/types.js';
import { formatPrompt, formatPromptAsMessages } from './formatter/converter.js';

/**
 * Response provider function type
 */
export type ResponseProvider = (prompt: CompiledPrompt, options?: QueryOptions) => string | Promise<string>;

/**
 * Test driver options
 */
export interface TestDriverOptions {
  responses?: string[] | ResponseProvider;
  delay?: number;
  formatterOptions?: FormatterOptions;
  preferMessageFormat?: boolean;
}

/**
 * Simple token estimation (roughly 4 characters per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Test driver for unit testing
 */
export class TestDriver implements AIDriver {
  private responseQueue: string[];
  private responseProvider?: ResponseProvider;
  private delay: number;
  private formatterOptions: FormatterOptions;
  public preferMessageFormat: boolean;
  
  constructor(options: TestDriverOptions = {}) {
    if (typeof options.responses === 'function') {
      this.responseProvider = options.responses;
      this.responseQueue = [];
    } else {
      this.responseQueue = options.responses ? [...options.responses] : [];
      this.responseProvider = undefined;
    }
    this.delay = options.delay || 0;
    this.formatterOptions = options.formatterOptions || {};
    this.preferMessageFormat = options.preferMessageFormat || false;
  }
  
  getFormatterOptions(): FormatterOptions {
    return this.formatterOptions;
  }
  
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Format the prompt based on driver preference
    let formattedPrompt: string;
    if (this.preferMessageFormat) {
      // Convert to messages then to text for token counting
      const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
      formattedPrompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n');
    } else {
      // Use standard text format
      formattedPrompt = formatPrompt(prompt, this.getFormatterOptions());
    }
    
    // If we have a response provider function, use it
    if (this.responseProvider) {
      const content = await this.responseProvider(prompt, options);
      
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
      
      return {
        content,
        usage: {
          promptTokens: estimateTokens(formattedPrompt),
          completionTokens: estimateTokens(content),
          totalTokens: estimateTokens(formattedPrompt) + estimateTokens(content)
        },
        finishReason: 'stop'
      };
    }
    
    // Otherwise use the queue
    if (this.responseQueue.length === 0) {
      throw new Error('No more responses available');
    }
    
    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    const content = this.responseQueue.shift()!;
    return {
      content,
      usage: {
        promptTokens: estimateTokens(formattedPrompt),
        completionTokens: estimateTokens(content),
        totalTokens: estimateTokens(formattedPrompt) + estimateTokens(content)
      },
      finishReason: 'stop'
    };
  }
  
  
  async *streamQuery(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string> {
    let response: string;
    
    // If we have a response provider function, use it
    if (this.responseProvider) {
      response = await this.responseProvider(prompt, options);
    } else {
      // Otherwise use the queue
      if (this.responseQueue.length === 0) {
        throw new Error('No more responses available');
      }
      response = this.responseQueue.shift()!;
    }
    
    // Stream response character by character
    for (const char of response) {
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay / response.length));
      }
      yield char;
    }
  }
  
  async close(): Promise<void> {
    // No resources to clean up
  }
}