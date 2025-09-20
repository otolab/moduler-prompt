import type { CompiledPrompt } from '@moduler-prompt/core';
import type { FormatterOptions, ChatMessage } from '../formatter/types.js';
import { formatPrompt, formatPromptAsMessages } from '../formatter/converter.js';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';
import { extractJSON } from '@moduler-prompt/utils';

/**
 * Base implementation for AI drivers
 * Provides common functionality and helper methods
 */
export abstract class BaseDriver implements AIDriver {
  /**
   * Default formatter options for this driver (internal use)
   */
  protected formatterOptions: FormatterOptions;

  /**
   * Whether to prefer message format over text format (internal use)
   */
  protected preferMessageFormat: boolean = false;

  constructor(formatterOptions: FormatterOptions = {}) {
    this.formatterOptions = formatterOptions;
  }

  /**
   * Get formatter options for this driver (internal use)
   */
  protected getFormatterOptions(): FormatterOptions {
    return this.formatterOptions;
  }

  /**
   * Query the AI model with a compiled prompt
   * Default implementation uses streamQuery internally if available
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Try to use stream implementation if available
    if (this.streamQuery) {
      const { result } = await this.streamQuery(prompt, options);
      return result;
    }

    // Otherwise use the legacy implementation
    if (this.preferMessageFormat) {
      const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
      return this.queryWithMessages(messages, options, prompt);
    } else {
      const text = formatPrompt(prompt, this.getFormatterOptions());
      return this.queryWithText(text, options, prompt);
    }
  }

  /**
   * Stream query with both stream and result
   * Default implementation creates a simple stream from query
   */
  async streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult> {
    // Default implementation for drivers that don't support streaming
    const queryResult = await this.queryInternal(prompt, options);

    // Create a simple async generator that yields the full content at once
    async function* simpleStream() {
      yield queryResult.content;
    }

    return {
      stream: simpleStream(),
      result: Promise.resolve(queryResult)
    };
  }

  /**
   * Internal query implementation
   * Subclasses can override this or the queryWithMessages/queryWithText methods
   */
  protected async queryInternal(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    if (this.preferMessageFormat) {
      const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
      return this.queryWithMessages(messages, options, prompt);
    } else {
      const text = formatPrompt(prompt, this.getFormatterOptions());
      return this.queryWithText(text, options, prompt);
    }
  }

  /**
   * Query with formatted messages (for message-based APIs)
   * Subclasses should override this for message-based implementations
   */
  protected async queryWithMessages(
    messages: ChatMessage[],
    options?: QueryOptions,
    prompt?: CompiledPrompt
  ): Promise<QueryResult> {
    // Default implementation: convert to text and use queryWithText
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    return this.queryWithText(text, options, prompt);
  }

  /**
   * Query with formatted text (for text-based APIs)
   * Subclasses should override this for text-based implementations
   */
  protected async queryWithText(
    text: string,
    options?: QueryOptions,
    prompt?: CompiledPrompt
  ): Promise<QueryResult> {
    // Default implementation: convert to messages and use queryWithMessages
    const messages: ChatMessage[] = [{ role: 'system', content: text }];
    return this.queryWithMessages(messages, options, prompt);
  }

  /**
   * Extract structured outputs from response if schema is specified
   * Helper method for drivers to use in their implementations
   */
  protected extractStructuredOutputs(content: string, prompt?: CompiledPrompt): unknown[] | undefined {
    if (!prompt?.metadata?.outputSchema) {
      return undefined;
    }

    const extraction = extractJSON(content, {
      repair: true,
      multiple: true
    });

    if (extraction.source !== 'none') {
      return Array.isArray(extraction.data) ? extraction.data : [extraction.data];
    } else {
      return [];
    }
  }

  /**
   * Close the driver connection
   * Default implementation does nothing
   */
  async close(): Promise<void> {
    // No-op by default
  }
}