/**
 * MLX Driver モデル固有処理
 *
 * モデルごとの特殊なフォーマット処理、メッセージ変換、プロンプト生成を管理
 * Python側のapply_model_specific_processingをTypeScript側に移行
 */

import type { MlxMessage, MlxCapabilities } from './types.js';
import { formatMessagesAsPrompt } from '../../formatter/converter.js';
import type { ChatMessage } from '../../formatter/types.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { MlxProcess } from './index.js';
import { ElementFormatterRegistry } from './element-formatters/index.js';
import { mergeSystemMessages, selectChatProcessor, selectCompletionProcessor } from './model-handlers.js';

export interface ModelSpecificProcessor {
  /**
   * Chat API用のモデル固有処理
   * メッセージ配列を受け取り、モデルに最適化されたメッセージ配列を返す
   */
  applyChatSpecificProcessing(messages: MlxMessage[]): MlxMessage[];

  /**
   * Completion API用のモデル固有処理（Element情報を保持）
   * CompiledPromptを受け取り、Element種別に応じた特殊トークンを適用したプロンプトを返す
   */
  formatCompletionPrompt(prompt: CompiledPrompt): Promise<string>;

  /**
   * Completion API用のモデル固有処理（文字列ベース、後方互換性のため維持）
   * プロンプト文字列を受け取り、モデルに最適化されたプロンプトを返す
   */
  applyCompletionSpecificProcessing(prompt: string): string;

  /**
   * メッセージ配列からCompletion用プロンプトを生成
   * apply_chat_templateがない場合に使用
   */
  generateMergedPrompt(messages: MlxMessage[]): string;
}


export class DefaultModelSpecificProcessor implements ModelSpecificProcessor {
  private specialTokensCache: MlxCapabilities['special_tokens'] | null = null;
  private formatterRegistry: ElementFormatterRegistry;

  constructor(private modelName: string, private process?: MlxProcess) {
    this.formatterRegistry = new ElementFormatterRegistry(modelName);
  }

  /**
   * 特殊トークンを取得（キャッシュ付き）
   */
  private async getSpecialTokens(): Promise<MlxCapabilities['special_tokens'] | null> {
    if (!this.process) return null;
    if (this.specialTokensCache) return this.specialTokensCache;

    const capabilities = await this.process.getCapabilities();
    this.specialTokensCache = capabilities?.special_tokens || null;
    return this.specialTokensCache;
  }

  /**
   * Element種別に応じた特殊トークンのフォーマット
   */
  private async formatElementWithTokens(element: any): Promise<string> {
    const specialTokens = await this.getSpecialTokens();
    return this.formatterRegistry.formatElement(element, specialTokens || undefined);
  }


  /**
   * Completion API用：CompiledPromptをElement情報を保持したまま処理
   */
  async formatCompletionPrompt(prompt: CompiledPrompt): Promise<string> {
    const sections: string[] = [];

    // Instructions section
    if (prompt.instructions.length > 0) {
      const instructionTexts = await Promise.all(
        prompt.instructions.map(el => this.formatElementWithTokens(el))
      );
      sections.push(instructionTexts.join('\n'));
    }

    // Data section
    if (prompt.data.length > 0) {
      const dataTexts = await Promise.all(
        prompt.data.map(el => this.formatElementWithTokens(el))
      );
      sections.push(dataTexts.join('\n'));
    }

    // Output section - 特にschemaやJSON出力の場合は特殊トークンを活用
    if (prompt.output.length > 0) {
      const specialTokens = await this.getSpecialTokens();
      const hasOutputSchema = !!prompt.metadata?.outputSchema;
      const outputTexts = await Promise.all(
        prompt.output.map(el =>
          this.formatterRegistry.formatOutputElement(el, specialTokens || undefined, hasOutputSchema)
        )
      );
      sections.push(outputTexts.join('\n'));
    }

    const basePrompt = sections.join('\n\n');

    // モデル固有の追加処理
    return this.applyCompletionSpecificProcessing(basePrompt);
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

  /**
   * Python側のgenerate_merged_promptに対応
   * apply_chat_templateがない場合のプロンプト生成
   */
  generateMergedPrompt(messages: MlxMessage[]): string {
    const mergedMessages = mergeSystemMessages(messages);
    
    // formatterを使用してプロンプト生成
    const chatMessages: ChatMessage[] = mergedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return formatMessagesAsPrompt(chatMessages);
  }
}

// ファクトリー関数
export function createModelSpecificProcessor(modelName: string, process?: MlxProcess): ModelSpecificProcessor {
  // 将来的に異なるプロセッサーを返すことも可能
  return new DefaultModelSpecificProcessor(modelName, process);
}