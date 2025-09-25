import type { CompiledPrompt } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from './types.js';
import type { FormatterOptions } from './formatter/types.js';
import { formatPrompt, formatPromptAsMessages } from './formatter/converter.js';
import { extractJSON } from '@moduler-prompt/utils';

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
export class EchoDriver implements AIDriver {
  private format: EchoDriverConfig['format'];
  private includeMetadata: boolean;
  private simulateUsage: boolean;
  private streamChunkSize: number;
  private formatterOptions: FormatterOptions;

  constructor(config: EchoDriverConfig = {}) {
    this.format = config.format || 'text';
    this.includeMetadata = config.includeMetadata ?? false;
    this.simulateUsage = config.simulateUsage ?? true;
    this.streamChunkSize = config.streamChunkSize ?? 100;
    this.formatterOptions = config.formatterOptions || {};
  }
  
  /**
   * Query implementation that echoes back the formatted prompt
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    let content: string;
    
    switch (this.format) {
      case 'text': {
        content = formatPrompt(prompt, this.formatterOptions);
        break;
      }

      case 'messages': {
        const messages = formatPromptAsMessages(prompt, this.formatterOptions);
        content = JSON.stringify(messages, null, 2);
        break;
      }

      case 'raw': {
        content = JSON.stringify(prompt, null, 2);
        break;
      }

      case 'both': {
        const text = formatPrompt(prompt, this.formatterOptions);
        const messages = formatPromptAsMessages(prompt, this.formatterOptions);
        content = JSON.stringify({
          text,
          messages
        }, null, 2);
        break;
      }

      case 'debug': {
        const text = formatPrompt(prompt, this.formatterOptions);
        const messages = formatPromptAsMessages(prompt, this.formatterOptions);

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
            formatterOptions: this.formatterOptions,
            queryOptions: options
          }
        };

        content = JSON.stringify(debug, null, 2);
        break;
      }

      default:
        content = formatPrompt(prompt, this.formatterOptions);
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
    
    // Handle structured outputs if schema is provided
    let structuredOutput: unknown | undefined;
    if (prompt.metadata?.outputSchema) {
      // For echo driver, we'll generate a sample based on the format
      if (this.format === 'raw' || this.format === 'messages' || this.format === 'both' || this.format === 'debug') {
        // These formats already return JSON, so try to extract
        const extracted = extractJSON(content, { multiple: false });
        if (extracted.source !== 'none' && extracted.data !== null) {
          structuredOutput = extracted.data;
        }
      } else if (this.format === 'text') {
        // For text format, we could simulate a JSON response if schema is provided
        // For now, we'll just try to extract any JSON that might be in the text
        const extracted = extractJSON(content, { multiple: false });
        if (extracted.source !== 'none' && extracted.data !== null) {
          structuredOutput = extracted.data;
        }
      }
    }

    // Simulate usage if requested
    const usage = this.simulateUsage ? {
      promptTokens: Math.ceil(content.length / 4),
      completionTokens: 0,
      totalTokens: Math.ceil(content.length / 4)
    } : undefined;

    return {
      content,
      structuredOutput,
      finishReason: 'stop',
      usage
    };
  }
  
  /**
   * Stream query implementation
   */
  async streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult> {
    const result = await this.query(prompt, options);
    const content = result.content;
    const chunkSize = this.streamChunkSize;

    // Create stream generator
    async function* streamGenerator(): AsyncIterable<string> {
      // Stream in chunks
      for (let i = 0; i < content.length; i += chunkSize) {
        yield content.slice(i, i + chunkSize);

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return {
      stream: streamGenerator(),
      result: Promise.resolve(result)
    };
  }
  
  /**
   * Close the driver
   */
  async close(): Promise<void> {
    // No resources to clean up
  }
}