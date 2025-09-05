import type { Element } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, ChatMessage, QueryResult } from './types.js';
import { elementsToPromptText } from './converter.js';

/**
 * Test driver options
 */
export interface TestDriverOptions {
  responses?: string[];
  defaultResponse?: string;
  delay?: number;
  throwError?: boolean;
  errorMessage?: string;
}

/**
 * Test driver for unit testing
 */
export class TestDriver implements AIDriver {
  private responses: string[];
  private currentIndex = 0;
  private defaultResponse: string;
  private delay: number;
  private throwError: boolean;
  private errorMessage: string;
  
  public queryHistory: Array<{ prompt: string; options?: QueryOptions }> = [];
  public chatHistory: Array<{ messages: ChatMessage[]; options?: QueryOptions }> = [];
  
  constructor(options: TestDriverOptions = {}) {
    this.responses = options.responses || [];
    this.defaultResponse = options.defaultResponse || 'Test response';
    this.delay = options.delay || 0;
    this.throwError = options.throwError || false;
    this.errorMessage = options.errorMessage || 'Test error';
  }
  
  async query(prompt: string | Element[], options?: QueryOptions): Promise<string> {
    // Convert elements to text if needed
    const promptText = typeof prompt === 'string' 
      ? prompt 
      : elementsToPromptText(prompt);
    
    // Record query
    this.queryHistory.push({ prompt: promptText, options });
    
    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    // Throw error if configured
    if (this.throwError) {
      throw new Error(this.errorMessage);
    }
    
    // Return response
    if (this.currentIndex < this.responses.length) {
      const response = this.responses[this.currentIndex];
      this.currentIndex++;
      return response;
    }
    
    return this.defaultResponse;
  }
  
  async chat(messages: ChatMessage[], options?: QueryOptions): Promise<QueryResult> {
    // Record chat
    this.chatHistory.push({ messages, options });
    
    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    // Throw error if configured
    if (this.throwError) {
      throw new Error(this.errorMessage);
    }
    
    // Get response
    let content: string;
    if (this.currentIndex < this.responses.length) {
      content = this.responses[this.currentIndex];
      this.currentIndex++;
    } else {
      content = this.defaultResponse;
    }
    
    return {
      content,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      finishReason: 'stop'
    };
  }
  
  async *streamQuery(prompt: string | Element[], options?: QueryOptions): AsyncIterable<string> {
    // Convert elements to text if needed
    const promptText = typeof prompt === 'string' 
      ? prompt 
      : elementsToPromptText(prompt);
    
    // Record query
    this.queryHistory.push({ prompt: promptText, options });
    
    // Get response
    let response: string;
    if (this.currentIndex < this.responses.length) {
      response = this.responses[this.currentIndex];
      this.currentIndex++;
    } else {
      response = this.defaultResponse;
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
    // Reset state
    this.currentIndex = 0;
    this.queryHistory = [];
    this.chatHistory = [];
  }
  
  /**
   * Reset the driver state
   */
  reset(): void {
    this.currentIndex = 0;
    this.queryHistory = [];
    this.chatHistory = [];
  }
  
  /**
   * Set new responses
   */
  setResponses(responses: string[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }
  
  /**
   * Get the last query
   */
  getLastQuery(): { prompt: string; options?: QueryOptions } | undefined {
    return this.queryHistory[this.queryHistory.length - 1];
  }
  
  /**
   * Get the last chat
   */
  getLastChat(): { messages: ChatMessage[]; options?: QueryOptions } | undefined {
    return this.chatHistory[this.chatHistory.length - 1];
  }
}