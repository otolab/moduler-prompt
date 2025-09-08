/**
 * MLX Driver 外部インターフェース
 * 
 * mlx-ml.tsドライバーからアクセスされるメイン API
 * 機能をモジュール化し、役割を分離
 */

import { Readable } from 'stream';
import type {
  MlxMlModelOptions,
  MlxMessage,
  MlxCapabilities,
  MlxFormatTestResult
} from './types.js';
import type { ModelSpec, ModelCustomProcessor } from '../model-spec/types.js';
import { ModelSpecManager } from '../model-spec/manager.js';
import { QueueManager, QueueManagerCallbacks } from './queue.js';
import { ProcessCommunication, ProcessCommunicationCallbacks } from './process-communication.js';
import { createModelSpecificProcessor, ModelSpecificProcessor } from './model-specific.js';

// API v2.0 型をエクスポート
export type { 
  MlxMlModelOptions,
  MlxMessage,
  MlxCapabilities, 
  MlxFormatTestResult 
};

export class MlxProcess {
  modelName: string;
  
  private queueManager: QueueManager;
  private processComm: ProcessCommunication;
  private modelProcessor: ModelSpecificProcessor;
  private specManager: ModelSpecManager;
  private initialized = false;

  constructor(
    modelName: string,
    customSpec?: Partial<ModelSpec>,
    customProcessor?: ModelCustomProcessor
  ) {
    this.modelName = modelName;
    this.modelProcessor = createModelSpecificProcessor(modelName);

    // コールバック設定
    const processCallbacks: ProcessCommunicationCallbacks = {
      onJsonResponse: (jsonData: string) => this.queueManager.handleJsonResponse(jsonData),
      onRequestCompleted: () => this.queueManager.onRequestCompleted()
    };

    const queueCallbacks: QueueManagerCallbacks = {
      sendToProcess: (data: string) => this.processComm.sendToProcess(data),
      createNewStream: () => this.processComm.createNewStream()
    };

    // 各コンポーネント初期化
    this.processComm = new ProcessCommunication(modelName, processCallbacks);
    this.queueManager = new QueueManager(queueCallbacks);
    
    // ModelSpecManager初期化（thisを渡すため後で初期化）
    this.specManager = new ModelSpecManager(modelName, this, customSpec, customProcessor);
  }
  
  /**
   * 初期化（動的検出）
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.specManager.initialize();
      this.initialized = true;
    }
  }

  // API v2.0 Capabilities
  async getCapabilities(): Promise<MlxCapabilities> {
    return this.queueManager.addCapabilitiesRequest();
  }

  // API v2.0 Format Test - TypeScript側でモデル固有処理を実行
  async formatTest(messages: MlxMessage[], options?: { primer?: string }): Promise<MlxFormatTestResult> {
    // TypeScript側でモデル固有処理を実行してからPython側に送信
    const processedMessages = this.modelProcessor.applyModelSpecificProcessing(messages);
    return this.queueManager.addFormatTestRequest(processedMessages, options);
  }

  // API v2.0 Chat - 自動的にchat/completionを選択（後方互換性のため残す）
  async chat(messages: MlxMessage[], primer?: string, options?: MlxMlModelOptions): Promise<Readable> {
    await this.ensureInitialized();
    
    // ModelSpecManagerで前処理
    let processedMessages = this.specManager.preprocessMessages(messages);
    
    // レガシーモデル固有処理（後方互換性のため残す）
    processedMessages = this.modelProcessor.applyModelSpecificProcessing(processedMessages);
    
    // 使用するAPIを決定
    const api = this.specManager.determineApi(processedMessages);
    
    if (api === 'completion') {
      // completion APIを使用
      const prompt = this.specManager.generatePrompt(processedMessages);
      const processedPrompt = this.modelProcessor.applyCompletionSpecificProcessing(prompt);
      // primerはcompletion時にここで追加（Python側では追加しない）
      const finalPrompt = primer ? processedPrompt + primer : processedPrompt;
      return this.queueManager.addCompletionRequest(finalPrompt, options);
    }
    
    // chat APIを使用（primerはPython側で処理される）
    return this.queueManager.addChatRequest(processedMessages, primer, options);
  }
  
  // API v2.0 Chat Direct - chat APIを直接使用（ドライバーが選択済み）
  async chatDirect(messages: MlxMessage[], primer?: string, options?: MlxMlModelOptions): Promise<Readable> {
    // レガシーモデル固有処理
    const processedMessages = this.modelProcessor.applyModelSpecificProcessing(messages);
    
    // chat APIを直接使用
    return this.queueManager.addChatRequest(processedMessages, primer, options);
  }

  // API v2.0 Completion - TypeScript側でモデル固有処理を実行
  async completion(prompt: string, options?: MlxMlModelOptions): Promise<Readable> {
    await this.ensureInitialized();
    
    // ModelSpecManagerで前処理
    let processedPrompt = this.specManager.preprocessCompletion(prompt);
    
    // レガシーcompletion固有処理（後方互換性のため残す）
    processedPrompt = this.modelProcessor.applyCompletionSpecificProcessing(processedPrompt);
    
    return this.queueManager.addCompletionRequest(processedPrompt, options);
  }


  exit() {
    this.processComm.exit();
  }

  // デバッグ・ステータス情報
  getStatus() {
    return {
      modelName: this.modelName,
      queueLength: this.queueManager.length,
      isStreamingActive: this.processComm.isStreamingActive(),
      isJsonBuffering: this.processComm.isJsonBuffering(),
      modelSpec: this.initialized ? this.specManager.getSpec() : null
    };
  }
  
  /**
   * ModelSpecManagerの取得（外部からカスタマイズする場合）
   */
  getSpecManager(): ModelSpecManager {
    return this.specManager;
  }
}