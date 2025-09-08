/**
 * MLX Driver 外部インターフェース
 * 
 * mlx-ml.tsドライバーからアクセスされるメイン API
 * 機能をモジュール化し、役割を分離
 */

import { Readable } from 'stream';
// Model spec functionality will be added later
interface ModelSpec {
  onlyCompletion?: boolean;
}
import type {
  MlxMlModelOptions,
  MlxMessage,
  MlxCapabilities,
  MlxFormatTestResult
} from './types.js';

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
  modelSpec: ModelSpec | undefined;
  
  private queueManager: QueueManager;
  private processComm: ProcessCommunication;
  private modelProcessor: ModelSpecificProcessor;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.modelSpec = undefined; // TODO: implement model spec lookup
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

  // API v2.0 Chat - TypeScript側でモデル固有処理を実行
  chat(messages: MlxMessage[], primer?: string, options?: MlxMlModelOptions): Promise<Readable> {
    // TypeScript側でモデル固有処理を実行（Python側のapply_model_specific_processing移行）
    const processedMessages = this.modelProcessor.applyModelSpecificProcessing(messages);
    
    // onlyCompletionモデルの場合はcompletion APIに変換
    if (this.modelSpec?.onlyCompletion) {
      const prompt = this.modelProcessor.generateMergedPrompt(processedMessages);
      const processedPrompt = this.modelProcessor.applyCompletionSpecificProcessing(prompt);
      const finalPrompt = primer ? processedPrompt + primer : processedPrompt;
      return this.queueManager.addCompletionRequest(finalPrompt, options);
    }
    
    return this.queueManager.addChatRequest(processedMessages, primer, options);
  }

  // API v2.0 Completion - TypeScript側でモデル固有処理を実行
  completion(prompt: string, options?: MlxMlModelOptions): Promise<Readable> {
    // TypeScript側でcompletion固有処理を実行（Python側のapply_completion_specific_processing移行）
    const processedPrompt = this.modelProcessor.applyCompletionSpecificProcessing(prompt);
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
      isJsonBuffering: this.processComm.isJsonBuffering()
    };
  }
}