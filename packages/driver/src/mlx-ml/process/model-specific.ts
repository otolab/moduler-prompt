/**
 * MLX Driver モデル固有処理
 *
 * モデルごとの特殊なフォーマット処理、メッセージ変換、プロンプト生成を管理
 * Python側のapply_model_specific_processingをTypeScript側に移行
 */

import type { MlxMessage } from './types.js';
import { selectChatProcessor, selectCompletionProcessor } from './model-handlers.js';

export interface ModelSpecificProcessor {
  /**
   * Chat API用のモデル固有処理
   * メッセージ配列を受け取り、モデルに最適化されたメッセージ配列を返す
   */
  applyChatSpecificProcessing(messages: MlxMessage[]): MlxMessage[];

  /**
   * Completion API用のモデル固有処理（文字列ベース）
   * プロンプト文字列を受け取り、モデルに最適化されたプロンプトを返す
   */
  applyCompletionSpecificProcessing(prompt: string): string;
}


export class DefaultModelSpecificProcessor implements ModelSpecificProcessor {
  constructor(private modelName: string) {
  }

  /**
   * Chat API用のモデル固有処理
   * モデルごとのチャットフォーマットに合わせるための処理
   */
  applyChatSpecificProcessing(messages: MlxMessage[]): MlxMessage[] {
    const processor = selectChatProcessor(this.modelName);
    return processor ? processor(messages) : messages;
  }

  /**
   * Completion API用のモデル固有処理
   * モデルごとにブロック化トークンやプロンプトフォーマットを適用
   */
  applyCompletionSpecificProcessing(prompt: string): string {
    const processor = selectCompletionProcessor(this.modelName);
    return processor ? processor(prompt) : prompt;
  }
}

// ファクトリー関数
export function createModelSpecificProcessor(
  modelName: string
): ModelSpecificProcessor {
  // 将来的に異なるプロセッサーを返すことも可能
  return new DefaultModelSpecificProcessor(modelName);
}