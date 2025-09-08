import { Readable } from 'stream';
import { BaseDriver } from '../base/base-driver.js';
import type { ChatMessage } from '../formatter/types.js';
import type { QueryOptions, QueryResult } from '../types.js';
import { MlxProcess } from './process/index.js';
import type { MlxMessage, MlxMlModelOptions } from './types.js';
import type { MlxCapabilities } from './process/types.js';
import type { ModelSpec, ModelCustomProcessor } from './model-spec/types.js';

/**
 * MLX ML driver configuration
 */
export interface MlxDriverConfig {
  model: string;
  defaultOptions?: Partial<MlxMlModelOptions>;
  modelSpec?: Partial<ModelSpec>;
  customProcessor?: ModelCustomProcessor;
}

/**
 * Stream wrapper for converting chunks to async iterable
 */
class StreamToAsyncIterable {
  private stream: Readable;
  private chunks: string[] = [];
  private finished = false;
  private error: Error | null = null;
  
  constructor(stream: Readable) {
    this.stream = stream;
    
    stream.on('data', (chunk) => {
      this.chunks.push(chunk.toString());
    });
    
    stream.on('end', () => {
      this.finished = true;
    });
    
    stream.on('error', (err) => {
      this.error = err;
      this.finished = true;
    });
  }
  
  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    while (true) {
      if (this.chunks.length > 0) {
        yield this.chunks.shift()!;
      } else if (this.finished) {
        if (this.error) {
          throw this.error;
        }
        break;
      } else {
        // Wait for more data
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }
}

/**
 * MLX ML driver using Python subprocess
 */
export class MlxDriver extends BaseDriver {
  private process: MlxProcess;
  private model: string;
  private defaultOptions: Partial<MlxMlModelOptions>;
  private capabilities: MlxCapabilities | null = null;
  
  constructor(config: MlxDriverConfig) {
    super();
    
    this.model = config.model;
    this.defaultOptions = config.defaultOptions || {};
    this.process = new MlxProcess(config.model, config.modelSpec, config.customProcessor);
    this.preferMessageFormat = true; // MLX uses message format
  }
  
  /**
   * Get special tokens from the MLX process
   */
  async getSpecialTokens(): Promise<MlxCapabilities['special_tokens'] | null> {
    if (!this.capabilities) {
      try {
        this.capabilities = await this.process.getCapabilities();
      } catch (error) {
        console.error('Failed to get MLX capabilities:', error);
        return null;
      }
    }
    return this.capabilities?.special_tokens || null;
  }
  
  /**
   * Convert our ChatMessage format to MLX format
   */
  private convertMessages(messages: ChatMessage[]): MlxMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));
  }
  
  /**
   * Query with messages
   */
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    try {
      // Convert messages to MLX format
      const mlxMessages = this.convertMessages(messages);
      
      // Merge options
      const mlxOptions: MlxMlModelOptions = {
        ...this.defaultOptions,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP
      };
      
      // Get stream from process
      const stream = await this.process.chat(mlxMessages, undefined, mlxOptions);
      
      // Collect all chunks
      let content = '';
      stream.on('data', (chunk) => {
        content += chunk.toString();
      });
      
      // Wait for stream to end
      await new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      return {
        content,
        finishReason: 'stop'
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
    options?: QueryOptions
  ): AsyncIterable<string> {
    const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
    const mlxMessages = this.convertMessages(messages);
    
    // Merge options
    const mlxOptions: MlxMlModelOptions = {
      ...this.defaultOptions,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP
    };
    
    // Get stream from process
    const stream = await this.process.chat(mlxMessages, undefined, mlxOptions);
    
    // Convert stream to async iterable
    const iterable = new StreamToAsyncIterable(stream);
    yield* iterable;
  }
  
  /**
   * Close the process
   */
  async close(): Promise<void> {
    this.process.exit();
  }
}

// Re-import for proper typing
import { formatPromptAsMessages } from '../formatter/converter.js';