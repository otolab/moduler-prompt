import type { CompiledPrompt } from '@moduler-prompt/core';
import type { FormatterOptions, ChatMessage } from '../formatter/types.js';
import { formatPrompt, formatPromptAsMessages } from '../formatter/converter.js';
import type { AIDriver, QueryOptions, QueryResult } from '../types.js';

/**
 * Base implementation for AI drivers
 */
export abstract class BaseDriver implements AIDriver {
  /**
   * Default formatter options for this driver
   */
  protected formatterOptions: FormatterOptions;
  
  /**
   * Whether to prefer message format over text format
   */
  public preferMessageFormat: boolean = false;
  
  constructor(formatterOptions: FormatterOptions = {}) {
    this.formatterOptions = formatterOptions;
  }
  
  /**
   * Get formatter options for this driver
   */
  getFormatterOptions(): FormatterOptions {
    return this.formatterOptions;
  }
  
  /**
   * Query the AI model with a compiled prompt
   * Subclasses should implement queryWithMessages or queryWithText
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    if (this.preferMessageFormat) {
      const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
      return this.queryWithMessages(messages, options);
    } else {
      const text = formatPrompt(prompt, this.getFormatterOptions());
      return this.queryWithText(text, options);
    }
  }
  
  /**
   * Stream query with a compiled prompt
   * Default implementation calls query (no streaming)
   */
  async *streamQuery(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string> {
    const result = await this.query(prompt, options);
    yield result.content;
  }
  
  /**
   * Query with formatted messages (for message-based APIs)
   */
  protected async queryWithMessages(messages: ChatMessage[], options?: QueryOptions): Promise<QueryResult> {
    // Default implementation: convert to text and use queryWithText
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    return this.queryWithText(text, options);
  }
  
  /**
   * Query with formatted text (for text-based APIs)
   */
  protected async queryWithText(text: string, options?: QueryOptions): Promise<QueryResult> {
    // Default implementation: convert to messages and use queryWithMessages
    const messages: ChatMessage[] = [{ role: 'system', content: text }];
    return this.queryWithMessages(messages, options);
  }
  
  /**
   * Get special tokens for this model
   * Default implementation returns null
   */
  async getSpecialTokens(): Promise<Record<string, any> | null> {
    return null;
  }
  
  /**
   * Close the driver connection
   * Default implementation does nothing
   */
  async close(): Promise<void> {
    // No-op by default
  }
}