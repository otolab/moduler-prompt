import { Readable } from 'stream';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';
import type { FormatterOptions, ChatMessage } from '../formatter/types.js';
import { formatPrompt, formatPromptAsMessages } from '../formatter/converter.js';
import { MlxProcess } from './process/index.js';
import type { MlxMessage, MlxMlModelOptions } from './types.js';
import type { MlxCapabilities } from './process/types.js';
import type { ModelSpec, ModelCustomProcessor } from './model-spec/types.js';
import { createModelSpecificProcessor } from './process/model-specific.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

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
export class MlxDriver implements AIDriver {
  private process: MlxProcess;
  private model: string;
  private defaultOptions: Partial<MlxMlModelOptions>;
  private capabilities: MlxCapabilities | null = null;
  private modelProcessor;
  private formatterOptions: FormatterOptions;
  private preferMessageFormat: boolean = true;
  
  /**
   * CompiledPromptにMessageElementが含まれているかチェック
   */
  private hasMessageElement(prompt: CompiledPrompt): boolean {
    const checkElements = (elements: unknown[]): boolean => {
      if (!elements) return false;
      return elements.some(element => {
        if (typeof element === 'object' && element !== null && 'type' in element && element.type === 'message') {
          return true;
        }
        return false;
      });
    };
    
    return (
      checkElements(prompt.instructions) ||
      checkElements(prompt.data) ||
      checkElements(prompt.output)
    );
  }
  
  constructor(config: MlxDriverConfig) {
    this.model = config.model;
    this.defaultOptions = config.defaultOptions || {};
    this.process = new MlxProcess(config.model, config.modelSpec, config.customProcessor);
    this.modelProcessor = createModelSpecificProcessor(config.model);
    this.formatterOptions = config.formatterOptions || {};
    this.preferMessageFormat = true; // MLX uses message format
  }

  /**
   * Get formatter options for this driver
   */
  protected getFormatterOptions(): FormatterOptions {
    return this.formatterOptions;
  }
  
  /**
   * Initialize spec manager if not already initialized
   */
  private async ensureInitialized(): Promise<void> {
    // Delegate to process's initialization
    const status = this.process.getStatus();
    if (!status.modelSpec) {
      // Force initialization by calling getCapabilities
      await this.getCapabilities();
    }
  }
  
  /**
   * Get capabilities from the MLX process
   */
  async getCapabilities(): Promise<MlxCapabilities | null> {
    if (!this.capabilities) {
      try {
        this.capabilities = await this.process.getCapabilities();
      } catch (error) {
        console.error('Failed to get MLX capabilities:', error);
        return null;
      }
    }
    return this.capabilities;
  }
  
  /**
   * Get special tokens from the MLX process
   */
  async getSpecialTokens(): Promise<MlxCapabilities['special_tokens'] | null> {
    const capabilities = await this.getCapabilities();
    return capabilities?.special_tokens || null;
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
   * Apply model-specific processing to messages
   */
  private applyModelSpecificProcessing(messages: MlxMessage[]): MlxMessage[] {
    return this.modelProcessor.applyModelSpecificProcessing(messages);
  }
  
  /**
   * Apply completion-specific processing to prompt
   */
  private applyCompletionSpecificProcessing(prompt: string): string {
    return this.modelProcessor.applyCompletionSpecificProcessing(prompt);
  }
  
  /**
   * Query the AI model with a compiled prompt
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    try {
      await this.ensureInitialized();
      
      // Promptから messages に変換
      const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
      const mlxMessages = this.convertMessages(messages);
      
      // Merge options (キャメルケース形式で渡す - mapOptionsToPythonで変換される)
      const mlxOptions: MlxMlModelOptions = {
        ...this.defaultOptions,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP
      };
      
      // APIを選択
      await this.process.ensureInitialized();
      const specManager = this.process.getSpecManager();
      
      // 前処理とモデル固有処理を適用
      let processedMessages = specManager.preprocessMessages(mlxMessages);
      processedMessages = this.applyModelSpecificProcessing(processedMessages);
      
      // MessageElementがあるかチェックしてAPIを決定
      const hasMessageEl = this.hasMessageElement(prompt);
      let api: 'chat' | 'completion';
      
      // まずモデルの制約を確認
      const canUseChat = specManager.canUseChat();
      const canUseCompletion = specManager.canUseCompletion();
      
      if (!canUseChat && !canUseCompletion) {
        throw new Error('Model supports neither chat nor completion API');
      }
      
      if (hasMessageEl) {
        // MessageElementがある場合はchatを優先
        if (canUseChat) {
          api = 'chat';
        } else {
          // chatが使えない場合はcompletionにフォールバック
          api = 'completion';
        }
      } else {
        // MessageElementがない場合
        if (!canUseChat) {
          // chatが使えない場合はcompletion
          api = 'completion';
        } else if (!canUseCompletion) {
          // completionが使えない場合はchat
          api = 'chat';
        } else {
          // 両方使える場合はモデルの特性に応じて判定
          api = specManager.determineApi(processedMessages);
        }
      }
      
      let stream: Readable;
      if (api === 'completion') {
        // completion APIを使用
        const promptText = specManager.generatePrompt(processedMessages);
        const processedPrompt = this.applyCompletionSpecificProcessing(promptText);
        stream = await this.process.completion(processedPrompt, mlxOptions);
      } else {
        // chat APIを使用
        stream = await this.process.chat(processedMessages, undefined, mlxOptions);
      }
      
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
    } catch {
      return {
        content: '',
        finishReason: 'error'
      };
    }
  }
  
  /**
   * Query with messages
   */
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    try {
      await this.ensureInitialized();
      
      // Convert messages to MLX format
      const mlxMessages = this.convertMessages(messages);
      
      // Merge options
      const mlxOptions: MlxMlModelOptions = {
        ...this.defaultOptions,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        topP: options.topP
      };
      
      // ドライバーレベルでAPIを選択
      await this.process.ensureInitialized();
      const specManager = this.process.getSpecManager();
      
      // 前処理とモデル固有処理を適用
      let processedMessages = specManager.preprocessMessages(mlxMessages);
      processedMessages = this.applyModelSpecificProcessing(processedMessages);
      
      const api = specManager.determineApi(processedMessages);
      
      let stream: Readable;
      if (api === 'completion') {
        // completion APIを使用
        const prompt = specManager.generatePrompt(processedMessages);
        const processedPrompt = this.applyCompletionSpecificProcessing(prompt);
        stream = await this.process.completion(processedPrompt, mlxOptions);
      } else {
        // chat APIを使用
        stream = await this.process.chat(processedMessages, undefined, mlxOptions);
      }
      
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
  async streamQuery(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): Promise<StreamResult> {
    await this.ensureInitialized();

    const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
    const mlxMessages = this.convertMessages(messages);

    // Merge options
    const mlxOptions: MlxMlModelOptions = {
      ...this.defaultOptions,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      topP: options?.topP
    };

    // ドライバーレベルでAPIを選択
    await this.process.ensureInitialized();
    const specManager = this.process.getSpecManager();

    // 前処理とモデル固有処理を適用
    let processedMessages = specManager.preprocessMessages(mlxMessages);
    processedMessages = this.applyModelSpecificProcessing(processedMessages);

    // MessageElementがあるかチェックしてAPIを決定
    const hasMessageEl = this.hasMessageElement(prompt);
    let api: 'chat' | 'completion';

    // まずモデルの制約を確認
    const canUseChat = specManager.canUseChat();
    const canUseCompletion = specManager.canUseCompletion();

    if (!canUseChat && !canUseCompletion) {
      throw new Error('Model supports neither chat nor completion API');
    }

    if (hasMessageEl) {
      // MessageElementがある場合はchatを優先
      if (canUseChat) {
        api = 'chat';
      } else {
        // chatが使えない場合はcompletionにフォールバック
        api = 'completion';
      }
    } else {
      // MessageElementがない場合
      if (!canUseChat) {
        // chatが使えない場合はcompletion
        api = 'completion';
      } else if (!canUseCompletion) {
        // completionが使えない場合はchat
        api = 'chat';
      } else {
        // 両方使える場合はモデルの特性に応じて判定
        api = specManager.determineApi(processedMessages);
      }
    }

    let stream: Readable;
    if (api === 'completion') {
      // completion APIを使用
      const promptText = specManager.generatePrompt(processedMessages);
      const processedPrompt = this.applyCompletionSpecificProcessing(promptText);
      stream = await this.process.completion(processedPrompt, mlxOptions);
    } else {
      // chat APIを使用
      stream = await this.process.chat(processedMessages, undefined, mlxOptions);
    }

    // Track accumulated content
    let fullContent = '';
    const chunks: string[] = [];

    // Convert stream to async iterable and collect chunks
    const iterable = new StreamToAsyncIterable(stream);

    // Process stream once to collect chunks
    const processStream = async () => {
      for await (const chunk of iterable) {
        fullContent += chunk;
        chunks.push(chunk);
      }
      return {
        content: fullContent,
        finishReason: 'stop' as const
      };
    };

    // Start processing
    const resultPromise = processStream();

    // Create a generator that yields the collected chunks
    async function* streamGenerator(): AsyncIterable<string> {
      let index = 0;
      while (index < chunks.length || !await isStreamComplete()) {
        if (index < chunks.length) {
          yield chunks[index++];
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }

    // Helper to check if stream processing is complete
    async function isStreamComplete(): Promise<boolean> {
      try {
        await Promise.race([
          resultPromise,
          new Promise(resolve => setTimeout(resolve, 0))
        ]);
        return true;
      } catch {
        return false;
      }
    }

    return {
      stream: streamGenerator(),
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