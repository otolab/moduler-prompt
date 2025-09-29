import type { CompiledPrompt } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from './types.js';
import { extractJSON } from '@moduler-prompt/utils';

/**
 * Response provider function type
 * A function that generates responses dynamically based on the prompt and options.
 * Called each time query() or streamQuery() is invoked.
 *
 * @param prompt - The compiled prompt being executed
 * @param options - Query options (temperature, maxTokens, etc.)
 * @returns The response string (can be JSON for structured outputs)
 */
export type ResponseProvider = (prompt: CompiledPrompt, options?: QueryOptions) => string | Promise<string>;

/**
 * Test driver options
 */
export interface TestDriverOptions {
  /**
   * Mock responses for the driver.
   * Can be either:
   * - An array of strings: responses are consumed sequentially (queue pattern)
   * - A function: called for each query to generate dynamic responses
   */
  responses?: string[] | ResponseProvider;

  /**
   * Delay in milliseconds to simulate API latency.
   * Applied before returning each response.
   */
  delay?: number;
}

/**
 * Simple token estimation (roughly 4 characters per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Test driver for unit testing and mocking AI responses.
 *
 * @example
 * // Using response queue (array)
 * const driver = new TestDriver({
 *   responses: ['First', 'Second', 'Third']
 * });
 * await driver.query(prompt); // Returns 'First'
 * await driver.query(prompt); // Returns 'Second'
 * await driver.query(prompt); // Returns 'Third'
 * await driver.query(prompt); // Throws: No more responses available
 *
 * @example
 * // Using response provider (function)
 * const driver = new TestDriver({
 *   responses: (prompt, options) => {
 *     if (prompt.metadata?.outputSchema) {
 *       return JSON.stringify({ result: 'structured' });
 *     }
 *     return 'Plain text';
 *   }
 * });
 */
export class TestDriver implements AIDriver {
  /** Queue of responses when using array mode */
  private responseQueue: string[];
  /** Function to generate responses dynamically */
  private responseProvider?: ResponseProvider;
  /** Delay in milliseconds to simulate latency */
  private delay: number;

  constructor(options: TestDriverOptions = {}) {
    if (typeof options.responses === 'function') {
      // Function mode: generate responses dynamically
      this.responseProvider = options.responses;
      this.responseQueue = [];
    } else {
      // Array mode: use responses as a queue (FIFO)
      this.responseQueue = options.responses ? [...options.responses] : [];
      this.responseProvider = undefined;
    }
    this.delay = options.delay || 0;
  }
  
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Create a simple formatted prompt for token counting
    const formattedPrompt = [
      prompt.instructions,
      prompt.data,
      prompt.output
    ].filter(Boolean).join('\n\n');

    // If we have a response provider function, use it
    if (this.responseProvider) {
      // Dynamic response generation mode
      const content = await this.responseProvider(prompt, options);

      // Simulate API latency if configured
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }

      // Handle structured outputs if schema is provided
      // This attempts to extract JSON from the response if outputSchema is defined
      let structuredOutput: unknown | undefined;
      if (prompt.metadata?.outputSchema && content) {
        const extracted = extractJSON(content, { multiple: false });
        if (extracted.source !== 'none' && extracted.data !== null) {
          structuredOutput = extracted.data;
        }
      }

      return {
        content,
        structuredOutput,
        usage: {
          promptTokens: estimateTokens(formattedPrompt),
          completionTokens: estimateTokens(content),
          totalTokens: estimateTokens(formattedPrompt) + estimateTokens(content)
        },
        finishReason: 'stop'
      };
    }

    // Queue mode: consume responses sequentially
    if (this.responseQueue.length === 0) {
      throw new Error('No more responses available');
    }

    // Simulate API latency if configured
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Take the first response from the queue (FIFO pattern)
    const content = this.responseQueue.shift()!;

    // Handle structured outputs if schema is provided
    // This attempts to extract JSON from the response if outputSchema is defined
    let structuredOutput: unknown | undefined;
    if (prompt.metadata?.outputSchema && content) {
      const extracted = extractJSON(content, { multiple: false });
      if (extracted.source !== 'none' && extracted.data !== null) {
        structuredOutput = extracted.data;
      }
    }

    return {
      content,
      structuredOutput,
      usage: {
        promptTokens: estimateTokens(formattedPrompt),
        completionTokens: estimateTokens(content),
        totalTokens: estimateTokens(formattedPrompt) + estimateTokens(content)
      },
      finishReason: 'stop'
    };
  }
  

  /**
   * Stream a response character by character.
   * Consumes one response from the queue or calls the provider function.
   */
  async streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult> {
    // Create a simple formatted prompt for token counting
    const formattedPrompt = [
      prompt.instructions,
      prompt.data,
      prompt.output
    ].filter(Boolean).join('\n\n');

    // Get the response (either from provider function or queue)
    let response: string;
    if (this.responseProvider) {
      // Dynamic mode: generate response
      response = await this.responseProvider(prompt, options);
    } else {
      // Queue mode: consume one response
      if (this.responseQueue.length === 0) {
        throw new Error('No more responses available');
      }
      response = this.responseQueue.shift()!;
    }

    // Create stream generator that yields characters one by one
    const delay = this.delay;
    async function* streamGenerator(): AsyncIterable<string> {
      // Stream response character by character to simulate streaming
      for (const char of response) {
        if (delay > 0) {
          // Distribute delay across all characters
          await new Promise(resolve => setTimeout(resolve, delay / response.length));
        }
        yield char;
      }
    }

    // Handle structured outputs if schema is provided
    // Extract JSON from the complete response (not streamed)
    let structuredOutput: unknown | undefined;
    if (prompt.metadata?.outputSchema && response) {
      const extracted = extractJSON(response, { multiple: false });
      if (extracted.source !== 'none' && extracted.data !== null) {
        structuredOutput = extracted.data;
      }
    }

    // Create result promise
    const resultPromise = Promise.resolve({
      content: response,
      structuredOutput,
      usage: {
        promptTokens: estimateTokens(formattedPrompt),
        completionTokens: estimateTokens(response),
        totalTokens: estimateTokens(formattedPrompt) + estimateTokens(response)
      },
      finishReason: 'stop' as const
    });

    return {
      stream: streamGenerator(),
      result: resultPromise
    };
  }
  
  async close(): Promise<void> {
    // No resources to clean up
  }
}