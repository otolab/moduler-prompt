import Anthropic from '@anthropic-ai/sdk';
import { BaseDriver } from '../base/base-driver.js';
import type { ChatMessage } from '../formatter/types.js';
import type { QueryOptions, QueryResult } from '../types.js';

/**
 * Anthropic driver configuration
 */
export interface AnthropicDriverConfig {
  apiKey?: string;
  model?: string;
  defaultOptions?: Partial<AnthropicQueryOptions>;
}

/**
 * Anthropic-specific query options
 */
export interface AnthropicQueryOptions extends QueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

/**
 * Anthropic API driver
 */
export class AnthropicDriver extends BaseDriver {
  private client: Anthropic;
  private defaultModel: string;
  private defaultOptions: Partial<AnthropicQueryOptions>;
  
  constructor(config: AnthropicDriverConfig = {}) {
    super();
    
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
    this.defaultOptions = config.defaultOptions || {};
    this.preferMessageFormat = true; // Anthropic uses message format
  }
  
  /**
   * Convert our ChatMessage format to Anthropic's format
   */
  private convertMessages(messages: ChatMessage[]): { 
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic puts system messages in a separate field
        system = system ? `${system}\n\n${msg.content}` : msg.content;
      } else if (msg.role === 'user') {
        anthropicMessages.push({ role: 'user', content: msg.content });
      } else {
        anthropicMessages.push({ role: 'assistant', content: msg.content });
      }
    }
    
    // Ensure messages alternate between user and assistant
    // If first message is not user, add a dummy user message
    if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: 'Continue.' });
    }
    
    // If last message is user, we're good
    // If last message is assistant, add a dummy user message
    if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === 'assistant') {
      anthropicMessages.push({ role: 'user', content: 'Continue.' });
    }
    
    // If no messages, add a default
    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: 'user', content: 'Please respond according to the instructions.' });
    }
    
    return { system, messages: anthropicMessages };
  }
  
  /**
   * Query with messages
   */
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options: AnthropicQueryOptions = {}
  ): Promise<QueryResult> {
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Convert messages
      const { system, messages: anthropicMessages } = this.convertMessages(messages);
      
      // Make the API call
      const response = await this.client.messages.create({
        model: mergedOptions.model || this.defaultModel,
        messages: anthropicMessages,
        max_tokens: mergedOptions.maxTokens || 4096,
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.topP,
        top_k: mergedOptions.topK,
        stop_sequences: mergedOptions.stopSequences,
        system
      });
      
      // Extract text content
      let content = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        }
      }
      
      // Map stop reason to our finish reason
      let finishReason: QueryResult['finishReason'] = 'stop';
      if (response.stop_reason === 'max_tokens') {
        finishReason = 'length';
      } else if (response.stop_reason === 'stop_sequence') {
        finishReason = 'stop';
      }
      
      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined,
        finishReason
      };
    } catch {
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
    options?: AnthropicQueryOptions
  ): AsyncIterable<string> {
    const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Convert messages
    const { system, messages: anthropicMessages } = this.convertMessages(messages);
    
    // Create stream
    const stream = await this.client.messages.create({
      model: mergedOptions.model || this.defaultModel,
      messages: anthropicMessages,
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature,
      system,
      stream: true
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
  
  /**
   * Close the client
   */
  async close(): Promise<void> {
    // Anthropic client doesn't need explicit closing
  }
}

// Re-import for proper typing
import { formatPromptAsMessages } from '../formatter/converter.js';