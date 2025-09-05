import type { CompiledPrompt } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions } from './types.js';

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
}

/**
 * Test driver for unit testing
 */
export class TestDriver implements AIDriver {
  private responseQueue: string[];
  private responseProvider?: ResponseProvider;
  private delay: number;
  
  constructor(options: TestDriverOptions = {}) {
    if (typeof options.responses === 'function') {
      this.responseProvider = options.responses;
      this.responseQueue = [];
    } else {
      this.responseQueue = options.responses ? [...options.responses] : [];
      this.responseProvider = undefined;
    }
    this.delay = options.delay || 0;
  }
  
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<string> {
    // If we have a response provider function, use it
    if (this.responseProvider) {
      const response = await this.responseProvider(prompt, options);
      
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
      
      return response;
    }
    
    // Otherwise use the queue
    if (this.responseQueue.length === 0) {
      throw new Error('No more responses available');
    }
    
    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    return this.responseQueue.shift()!;
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