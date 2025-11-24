import { Readable } from 'stream';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';
import type { FormatterOptions, ChatMessage } from '../formatter/types.js';
import { formatPromptAsMessages } from '../formatter/converter.js';
import { formatCompletionPrompt } from '../formatter/completion-formatter.js';
import { MlxProcess } from './process/index.js';
import type { MlxMessage, MlxMlModelOptions, MlxModelCapabilities } from './types.js';
import type { MlxRuntimeInfo } from './process/types.js';
import { createModelSpecificProcessor } from './process/model-specific.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import { extractJSON } from '@moduler-prompt/utils';

// ========================================================================
// Utility Functions (exported for testing)
// ========================================================================

/**
 * Check if the prompt contains MessageElement
 */
export function hasMessageElement(prompt: CompiledPrompt): boolean {
  const checkElements = (elements: unknown[]): boolean => {
    if (!elements) return false;
    return elements.some(element => {
      const el = element as { type?: string };
      return el?.type === 'message';
    });
  };

  return checkElements(prompt.instructions) ||
    checkElements(prompt.data) ||
    checkElements(prompt.output);
}

/**
 * Convert ChatMessage format to MLX format
 */
export function convertMessages(messages: ChatMessage[]): MlxMessage[] {
  return messages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }));
}

// ========================================================================
// Main Class
// ========================================================================

/**
 * MLX ML driver configuration
 */
export interface MlxDriverConfig {
  model: string;
  defaultOptions?: Partial<MlxMlModelOptions>;
  formatterOptions?: FormatterOptions;
}

/**
 * Creates an async iterable from a readable stream with content collection
 */
function createStreamIterable(stream: Readable): {
  iterable: AsyncIterable<string>;
  completion: Promise<{ content: string; error: Error | null }>;
} {
  const chunks: string[] = [];
  let resolveCompletion: (value: { content: string; error: Error | null }) => void;

  const completion = new Promise<{ content: string; error: Error | null }>((resolve) => {
    resolveCompletion = resolve;
  });

  // Create async iterable that collects chunks and handles completion
  const iterable = {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      try {
        for await (const chunk of stream) {
          const str = chunk.toString();
          chunks.push(str);
          yield str;
        }
        // Stream ended successfully
        resolveCompletion({ content: chunks.join(''), error: null });
      } catch (error) {
        // Stream errored
        resolveCompletion({ content: chunks.join(''), error: error as Error });
        throw error;
      }
    }
  };

  return { iterable, completion };
}

/**
 * MLX ML driver using Python subprocess
 */
export class MlxDriver implements AIDriver {
  private process: MlxProcess;
  private model: string;
  private defaultOptions: Partial<MlxMlModelOptions>;
  private runtimeInfo: MlxRuntimeInfo | null = null;
  private modelProcessor;
  private formatterOptions: FormatterOptions;
  
  
  constructor(config: MlxDriverConfig) {
    this.model = config.model;
    this.defaultOptions = config.defaultOptions || {};
    this.formatterOptions = config.formatterOptions || {};
    this.process = new MlxProcess(config.model);
    this.modelProcessor = createModelSpecificProcessor(config.model);
  }

  /**
   * Initialize process and cache runtime info
   */
  private async ensureInitialized(): Promise<void> {
    // Ensure process is initialized
    await this.process.ensureInitialized();

    // Cache runtime info if not already cached
    if (!this.runtimeInfo) {
      try {
        this.runtimeInfo = await this.process.getCapabilities();

        // Update formatterOptions with special tokens from runtime info
        if (this.runtimeInfo.special_tokens) {
          this.formatterOptions.specialTokens = this.runtimeInfo.special_tokens;
        }
      } catch (error) {
        console.error('Failed to get MLX runtime info:', error);
      }
    }
  }

  /**
   * Determine which API to use (chat or completion)
   * Simple logic based on runtime info only
   */
  private determineApi(options?: QueryOptions): 'chat' | 'completion' {
    const strategy = options?.apiStrategy || 'auto';

    if (strategy === 'force-completion') return 'completion';
    if (strategy === 'force-chat') return 'chat';

    // auto: use chat if chat template is available
    return this.runtimeInfo?.features.apply_chat_template ? 'chat' : 'completion';
  }
  
  /**
   * Execute query and return stream
   * Common logic for query and streamQuery
   */
  private async executeQuery(
    prompt: CompiledPrompt,
    mlxOptions: MlxMlModelOptions,
    options?: QueryOptions
  ): Promise<Readable> {
    // APIを選択
    const api = this.determineApi(options);

    let stream: Readable;
    if (api === 'completion') {
      // completion APIを使用 - 標準フォーマッターを使用
      let formattedPrompt = formatCompletionPrompt(prompt, this.formatterOptions);
      // モデル固有の後処理を適用
      formattedPrompt = this.modelProcessor.applyCompletionSpecificProcessing(formattedPrompt);
      stream = await this.process.completion(formattedPrompt, mlxOptions);
    } else {
      // chat APIを使用 - メッセージ変換して処理
      const messages = formatPromptAsMessages(prompt, this.formatterOptions);
      let mlxMessages = convertMessages(messages);
      // chat APIではチャット処理を適用
      mlxMessages = this.modelProcessor.applyChatSpecificProcessing(mlxMessages);
      stream = await this.process.chat(mlxMessages, undefined, mlxOptions);
    }

    return stream;
  }

  /**
   * Query the AI model with a compiled prompt
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Use streamQuery for consistency with other drivers
    const { stream, result } = await this.streamQuery(prompt, options);

    // Consume the stream to trigger completion
    // This is necessary because the result promise only resolves when the stream is fully consumed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _chunk of stream) {
      // Just consume the stream, don't need to do anything with the chunks
    }

    return result;
  }
  /**
   * Stream query implementation
   */
  async streamQuery(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): Promise<StreamResult> {
    await this.ensureInitialized();

    // Merge options (only override if explicitly provided)
    const mlxOptions: MlxMlModelOptions = {
      ...this.defaultOptions,
      ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.topP !== undefined && { topP: options.topP })
    };

    // Use executeQuery for the actual stream generation
    const stream = await this.executeQuery(prompt, mlxOptions, options);

    // Convert stream to async iterable with collection
    const { iterable, completion } = createStreamIterable(stream);

    // Create result promise that waits for stream completion
    const resultPromise = completion.then(({ content, error }) => {
      // If there was an error, throw it
      if (error) {
        throw error;
      }

      // Handle structured output if schema is provided
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
        finishReason: 'stop' as const
      };
    });

    return {
      stream: iterable,
      result: resultPromise
    };
  }
  
  /**
   * Get model capabilities (public API)
   *
   * Returns runtime information converted to camelCase
   */
  async getCapabilities(): Promise<MlxModelCapabilities> {
    await this.ensureInitialized();

    if (!this.runtimeInfo) {
      throw new Error('Failed to retrieve model capabilities');
    }

    // Convert snake_case to camelCase
    return {
      methods: this.runtimeInfo.methods,
      specialTokens: this.runtimeInfo.special_tokens,
      features: {
        hasChatTemplate: this.runtimeInfo.features.apply_chat_template,
        vocabSize: this.runtimeInfo.features.vocab_size,
        modelMaxLength: this.runtimeInfo.features.model_max_length,
        chatTemplate: this.runtimeInfo.features.chat_template ? {
          templateString: this.runtimeInfo.features.chat_template.template_string,
          supportedRoles: this.runtimeInfo.features.chat_template.supported_roles,
          preview: this.runtimeInfo.features.chat_template.preview,
          constraints: this.runtimeInfo.features.chat_template.constraints
        } : undefined
      },
      chatRestrictions: this.runtimeInfo.chat_restrictions ? {
        singleSystemAtStart: this.runtimeInfo.chat_restrictions.single_system_at_start,
        maxSystemMessages: this.runtimeInfo.chat_restrictions.max_system_messages,
        alternatingTurns: this.runtimeInfo.chat_restrictions.alternating_turns,
        requiresUserLast: this.runtimeInfo.chat_restrictions.requires_user_last,
        allowEmptyMessages: this.runtimeInfo.chat_restrictions.allow_empty_messages,
      } : undefined
    };
  }

  /**
   * Close the process
   */
  async close(): Promise<void> {
    this.process.exit();
  }
}