import { Readable } from 'stream';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';
import type { FormatterOptions, ChatMessage } from '../formatter/types.js';
import { formatPromptAsMessages } from '../formatter/converter.js';
import { MlxProcess } from './process/index.js';
import type { MlxMessage, MlxMlModelOptions } from './types.js';
import type { MlxCapabilities } from './process/types.js';
import type { ModelSpec, ModelCustomProcessor } from './model-spec/types.js';
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

/**
 * Determine which API to use based on prompt and model capabilities
 * Exported for testing purposes
 */
export function determineApiSelection(
  prompt: CompiledPrompt,
  specManager: {
    canUseChat: () => boolean;
    canUseCompletion: () => boolean;
    preprocessMessages: (messages: MlxMessage[]) => MlxMessage[];
    determineApi: (messages: MlxMessage[]) => 'chat' | 'completion';
  },
  formatterOptions: FormatterOptions
): 'chat' | 'completion' {
  const canUseChat = specManager.canUseChat();
  const canUseCompletion = specManager.canUseCompletion();

  if (!canUseChat && !canUseCompletion) {
    throw new Error('Model supports neither chat nor completion API');
  }

  const hasMessageEl = hasMessageElement(prompt);

  if (hasMessageEl) {
    // MessageElementがある場合はchatを優先
    if (canUseChat) {
      return 'chat';
    } else {
      // chatが使えない場合はcompletionにフォールバック
      return 'completion';
    }
  } else {
    // MessageElementがない場合
    if (!canUseChat) {
      // chatが使えない場合はcompletion
      return 'completion';
    } else if (!canUseCompletion) {
      // completionが使えない場合はchat
      return 'chat';
    } else {
      // 両方使える場合はモデルの特性に応じて判定
      const messages = formatPromptAsMessages(prompt, formatterOptions);
      const mlxMessages = convertMessages(messages);
      const preprocessedMessages = specManager.preprocessMessages(mlxMessages);
      return specManager.determineApi(preprocessedMessages);
    }
  }
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
  modelSpec?: Partial<ModelSpec>;
  customProcessor?: ModelCustomProcessor;
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
  private capabilities: MlxCapabilities | null = null;
  private modelProcessor;
  private formatterOptions: FormatterOptions;
  private preferMessageFormat: boolean = true;
  
  
  constructor(config: MlxDriverConfig) {
    this.model = config.model;
    this.defaultOptions = config.defaultOptions || {};
    this.process = new MlxProcess(config.model, config.modelSpec, config.customProcessor);
    // special_tokensを取得できるようにプロセスを渡す
    this.modelProcessor = createModelSpecificProcessor(config.model, this.process);
    this.formatterOptions = config.formatterOptions || {};
    this.preferMessageFormat = true; // MLX uses message format
  }

  /**
   * Initialize process and cache capabilities
   */
  private async ensureInitialized(): Promise<void> {
    // Ensure process is initialized
    await this.process.ensureInitialized();

    // Cache capabilities if not already cached
    if (!this.capabilities) {
      try {
        this.capabilities = await this.process.getCapabilities();
      } catch (error) {
        console.error('Failed to get MLX capabilities:', error);
      }
    }
  }
  
  /**
   * Execute query and return stream
   * Common logic for query and streamQuery
   */
  private async executeQuery(
    prompt: CompiledPrompt,
    mlxOptions: MlxMlModelOptions
  ): Promise<Readable> {
    // APIを選択
    const specManager = this.process.getSpecManager();
    const api = determineApiSelection(prompt, specManager, this.formatterOptions);

    let stream: Readable;
    if (api === 'completion') {
      // completion APIを使用 - Element情報を保持したまま処理
      const processedPrompt = await this.modelProcessor.formatCompletionPrompt(prompt);
      stream = await this.process.completion(processedPrompt, mlxOptions);
    } else {
      // chat APIを使用 - メッセージ変換して処理
      const messages = formatPromptAsMessages(prompt, this.formatterOptions);
      const mlxMessages = convertMessages(messages);
      let processedMessages = specManager.preprocessMessages(mlxMessages);
      // chat APIではチャット処理を適用
      processedMessages = this.modelProcessor.applyChatSpecificProcessing(processedMessages);
      stream = await this.process.chat(processedMessages, undefined, mlxOptions);
    }

    return stream;
  }

  /**
   * Query the AI model with a compiled prompt
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Use streamQuery for consistency with other drivers
    const { result } = await this.streamQuery(prompt, options);
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
    const stream = await this.executeQuery(prompt, mlxOptions);

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
   * Close the process
   */
  async close(): Promise<void> {
    this.process.exit();
  }
}