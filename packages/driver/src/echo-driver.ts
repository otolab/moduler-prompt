import { BaseDriver } from './base/base-driver.js';
import type { FormatterOptions, ChatMessage } from '@moduler-prompt/utils';
import { formatPrompt, formatPromptAsMessages } from '@moduler-prompt/utils';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { QueryOptions, QueryResult } from './types.js';

/**
 * Echo driver configuration
 */
export interface EchoDriverConfig {
  /**
   * Format for echo output
   * - 'text': Return formatted text
   * - 'messages': Return formatted messages as JSON
   * - 'raw': Return raw compiled prompt as JSON
   * - 'both': Return both text and messages
   * - 'debug': Return detailed debug information
   */
  format?: 'text' | 'messages' | 'raw' | 'both' | 'debug';
  
  /**
   * Include metadata in response
   */
  includeMetadata?: boolean;
  
  /**
   * Custom formatter options
   */
  formatterOptions?: FormatterOptions;
  
  /**
   * Simulate usage statistics
   */
  simulateUsage?: boolean;
  
  /**
   * Stream chunk size (for streaming mode)
   */
  streamChunkSize?: number;
}

/**
 * Echo test driver that returns the formatted prompt
 * Useful for testing and debugging prompt generation
 */
export class EchoDriver extends BaseDriver {
  private format: EchoDriverConfig['format'];
  private includeMetadata: boolean;
  private simulateUsage: boolean;
  private streamChunkSize: number;
  
  constructor(config: EchoDriverConfig = {}) {
    super(config.formatterOptions);
    
    this.format = config.format || 'text';
    this.includeMetadata = config.includeMetadata ?? false;
    this.simulateUsage = config.simulateUsage ?? true;
    this.streamChunkSize = config.streamChunkSize ?? 100;
    
    // Set preferMessageFormat based on format option
    this.preferMessageFormat = this.format === 'messages';
  }
  
  /**
   * Query implementation that echoes back the formatted prompt
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    let content: string;
    
    switch (this.format) {
      case 'text': {
        content = formatPrompt(prompt, this.getFormatterOptions());
        break;
      }
      
      case 'messages': {
        const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
        content = JSON.stringify(messages, null, 2);
        break;
      }
      
      case 'raw': {
        content = JSON.stringify(prompt, null, 2);
        break;
      }
      
      case 'both': {
        const text = formatPrompt(prompt, this.getFormatterOptions());
        const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
        content = JSON.stringify({
          text,
          messages
        }, null, 2);
        break;
      }
      
      case 'debug': {
        const text = formatPrompt(prompt, this.getFormatterOptions());
        const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
        
        const debug = {
          raw: prompt,
          formatted: {
            text,
            messages
          },
          metadata: {
            instructionsCount: prompt.instructions?.length || 0,
            dataCount: prompt.data?.length || 0,
            outputCount: prompt.output?.length || 0,
            formatterOptions: this.getFormatterOptions(),
            queryOptions: options
          }
        };
        
        content = JSON.stringify(debug, null, 2);
        break;
      }
      
      default:
        content = formatPrompt(prompt, this.getFormatterOptions());
    }
    
    // Add metadata if requested
    if (this.includeMetadata && this.format !== 'debug') {
      const metadata = {
        format: this.format,
        timestamp: new Date().toISOString(),
        options
      };
      content = `=== METADATA ===\n${JSON.stringify(metadata, null, 2)}\n\n=== CONTENT ===\n${content}`;
    }
    
    // Simulate usage if requested
    const usage = this.simulateUsage ? {
      promptTokens: Math.ceil(content.length / 4),
      completionTokens: 0,
      totalTokens: Math.ceil(content.length / 4)
    } : undefined;
    
    return {
      content,
      finishReason: 'stop',
      usage
    };
  }
  
  /**
   * Stream query implementation
   */
  async *streamQuery(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string> {
    const result = await this.query(prompt, options);
    const content = result.content;
    
    // Stream in chunks
    for (let i = 0; i < content.length; i += this.streamChunkSize) {
      yield content.slice(i, i + this.streamChunkSize);
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  /**
   * Override queryWithMessages to handle message format
   */
  protected async queryWithMessages(messages: ChatMessage[], options?: QueryOptions): Promise<QueryResult> {
    let content: string;
    
    if (this.format === 'messages' || this.format === 'both') {
      content = JSON.stringify(messages, null, 2);
    } else {
      // Convert messages back to text for other formats
      content = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    }
    
    if (this.includeMetadata) {
      const metadata = {
        format: 'messages',
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
        options
      };
      content = `=== METADATA ===\n${JSON.stringify(metadata, null, 2)}\n\n=== MESSAGES ===\n${content}`;
    }
    
    const usage = this.simulateUsage ? {
      promptTokens: Math.ceil(content.length / 4),
      completionTokens: 0,
      totalTokens: Math.ceil(content.length / 4)
    } : undefined;
    
    return {
      content,
      finishReason: 'stop',
      usage
    };
  }
  
  /**
   * Override queryWithText to handle text format
   */
  protected async queryWithText(text: string, options?: QueryOptions): Promise<QueryResult> {
    let content = text;
    
    if (this.includeMetadata) {
      const metadata = {
        format: 'text',
        textLength: text.length,
        timestamp: new Date().toISOString(),
        options
      };
      content = `=== METADATA ===\n${JSON.stringify(metadata, null, 2)}\n\n=== TEXT ===\n${content}`;
    }
    
    const usage = this.simulateUsage ? {
      promptTokens: Math.ceil(content.length / 4),
      completionTokens: 0,
      totalTokens: Math.ceil(content.length / 4)
    } : undefined;
    
    return {
      content,
      finishReason: 'stop',
      usage
    };
  }
}