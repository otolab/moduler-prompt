import Anthropic from '@anthropic-ai/sdk';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';

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
export class AnthropicDriver implements AIDriver {
  private client: Anthropic;
  private defaultModel: string;
  private defaultOptions: Partial<AnthropicQueryOptions>;

  constructor(config: AnthropicDriverConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
    this.defaultOptions = config.defaultOptions || {};
  }

  /**
   * Convert CompiledPrompt to Anthropic messages
   */
  private compiledPromptToAnthropic(prompt: CompiledPrompt): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Helper to process elements
    const processElements = (elements: unknown[]): string => {
      const content: string[] = [];

      for (const element of elements) {
        if (typeof element === 'string') {
          content.push(element);
        } else if (typeof element === 'object' && element !== null && 'type' in element) {
          const el = element as any;

          if (el.type === 'text') {
            content.push(el.content);
          } else if (el.type === 'message') {
            // Handle message elements separately
            const role = el.role === 'system' ? 'system' : el.role === 'user' ? 'user' : 'assistant';
            const messageContent = typeof el.content === 'string' ? el.content : JSON.stringify(el.content);

            if (role === 'system') {
              system = system ? `${system}\n\n${messageContent}` : messageContent;
            } else {
              messages.push({ role: role as 'user' | 'assistant', content: messageContent });
            }
          } else if (el.type === 'section' || el.type === 'subsection') {
            // Process section content
            if (el.title) content.push(`## ${el.title}`);
            if (el.content) content.push(el.content);
            if (el.items) {
              for (const item of el.items) {
                if (typeof item === 'string') {
                  content.push(item);
                } else if (item.type === 'subsection') {
                  if (item.title) content.push(`### ${item.title}`);
                  if (item.content) content.push(item.content);
                  if (item.items) {
                    content.push(...item.items.filter((i: any) => typeof i === 'string'));
                  }
                }
              }
            }
          } else {
            // Default formatting for other elements
            content.push(JSON.stringify(el));
          }
        }
      }

      return content.join('\n');
    };

    // Process instructions as system message
    if (prompt.instructions && prompt.instructions.length > 0) {
      const instructionContent = processElements(prompt.instructions);
      if (instructionContent) {
        system = system ? `${system}\n\n${instructionContent}` : instructionContent;
      }
    }

    // Process data as user message
    if (prompt.data && prompt.data.length > 0) {
      const dataContent = processElements(prompt.data);
      if (dataContent) {
        messages.push({ role: 'user', content: dataContent });
      }
    }

    // Process output as user message
    if (prompt.output && prompt.output.length > 0) {
      const outputContent = processElements(prompt.output);
      if (outputContent) {
        messages.push({ role: 'user', content: outputContent });
      }
    }

    // Ensure messages alternate between user and assistant
    // If first message is not user, add a dummy user message
    if (messages.length > 0 && messages[0].role !== 'user') {
      messages.unshift({ role: 'user', content: 'Continue.' });
    }

    // If last message is assistant, add a dummy user message
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      messages.push({ role: 'user', content: 'Continue.' });
    }

    // If no messages, add a default
    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Please respond according to the instructions.' });
    }

    return { system, messages };
  }

  /**
   * Query the AI model
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Use streamQuery for consistency
    const { result } = await this.streamQuery(prompt, options);
    return result;
  }

  /**
   * Stream query implementation
   */
  async streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult> {
    const anthropicOptions = options as AnthropicQueryOptions || {};
    const mergedOptions = { ...this.defaultOptions, ...anthropicOptions };

    // Convert prompt
    const { system, messages } = this.compiledPromptToAnthropic(prompt);

    // Create stream
    const anthropicStream = await this.client.messages.create({
      model: mergedOptions.model || this.defaultModel,
      messages,
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature,
      top_p: mergedOptions.topP,
      top_k: mergedOptions.topK,
      stop_sequences: mergedOptions.stopSequences,
      system,
      stream: true
    });

    // Shared state
    let fullContent = '';
    let usage: QueryResult['usage'] | undefined;
    let finishReason: QueryResult['finishReason'] = 'stop';
    let streamConsumed = false;
    const chunks: string[] = [];

    // Process the stream
    const processStream = async () => {
      for await (const chunk of anthropicStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const content = chunk.delta.text;
          fullContent += content;
          chunks.push(content);
        } else if (chunk.type === 'message_stop') {
          // Get usage from the final message
          const finalMessage = chunk as any;
          if (finalMessage.message?.usage) {
            usage = {
              promptTokens: finalMessage.message.usage.input_tokens,
              completionTokens: finalMessage.message.usage.output_tokens,
              totalTokens: finalMessage.message.usage.input_tokens + finalMessage.message.usage.output_tokens
            };
          }
        }
      }
      streamConsumed = true;
    };

    // Start processing
    const processingPromise = processStream();

    // Create stream generator
    const streamGenerator = async function* () {
      let index = 0;
      while (!streamConsumed || index < chunks.length) {
        if (index < chunks.length) {
          yield chunks[index++];
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    };

    // Create result promise
    const resultPromise = processingPromise.then(() => {
      // Anthropic doesn't have native structured output support yet
      // Would need to use prompt engineering or tool use
      let structuredOutputs: unknown[] | undefined;

      return {
        content: fullContent,
        structuredOutputs,
        usage,
        finishReason
      };
    });

    return {
      stream: streamGenerator(),
      result: resultPromise
    };
  }

  /**
   * Close the client
   */
  async close(): Promise<void> {
    // Anthropic client doesn't need explicit closing
  }
}