/**
 * MLX Driver モデル固有処理
 * 
 * モデルごとの特殊なフォーマット処理、メッセージ変換、プロンプト生成を管理
 * Python側のapply_model_specific_processingをTypeScript側に移行
 */

import type { MlxMessage, MlxCapabilities } from './types.js';
import { formatMessagesAsPrompt } from '../../formatter/converter.js';
import type { ChatMessage } from '../../formatter/types.js';
import type { CompiledPrompt, Element } from '@moduler-prompt/core';
import type { MlxProcess } from './index.js';

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

function mergeSystemMessages(msgs: MlxMessage[]): MlxMessage[] {
  let systemContent = '';
  const conversation: MlxMessage[] = [];
  
  for (const msg of msgs) {
    if (msg.role === 'system') {
      systemContent += msg.content + '\\n\\n';
    } else {
      conversation.push(msg);
    }
  }
  
  if (systemContent) {
    const systemMessage: MlxMessage = { role: 'system', content: systemContent.trim() };
    return [systemMessage, ...conversation];
  }
  return conversation;
}

export class DefaultModelSpecificProcessor implements ModelSpecificProcessor {
  private specialTokensCache: MlxCapabilities['special_tokens'] | null = null;

  constructor(private modelName: string, private process?: MlxProcess) {}

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
  private async formatElementWithTokens(element: Element): Promise<string> {
    const specialTokens = await this.getSpecialTokens();
    switch (element.type) {
      case 'text':
        return element.content;

      case 'message':
        // 特殊トークンが利用可能な場合は使用
        if (specialTokens) {
          const roleTokens = specialTokens[element.role];
          if (roleTokens && typeof roleTokens === 'object' && 'start' in roleTokens && 'end' in roleTokens) {
            // start/endトークンがある場合
            return `${roleTokens.start.text}${element.content}${roleTokens.end.text}\n`;
          }
        }

        // モデル固有のフォールバック処理
        if (this.modelName.indexOf('gemma-3') !== -1) {
          const roleMap = {
            system: 'user',  // Gemma-3はsystemロールをサポートしない
            user: 'user',
            assistant: 'model'
          };
          const role = roleMap[element.role as keyof typeof roleMap] || 'user';
          // Gemma-3のデフォルトトークン
          return `<start_of_turn>${role}\n${element.content}<end_of_turn>\n`;
        }
        // デフォルトは通常のテキスト形式
        return `[${element.role.toUpperCase()}]\n${element.content}\n`;

      case 'section':
        const sectionItems = await Promise.all(
          element.items.map(async item => {
            if (typeof item === 'string') {
              return item;
            } else if ('type' in item && item.type === 'subsection') {
              return await this.formatElementWithTokens(item);
            } else {
              // DynamicContentは既にコンパイル時に解決されているはず
              return '';
            }
          })
        );
        const sectionContent = sectionItems.join('\n');
        return `=== ${element.title} ===\n${sectionContent}\n`;

      case 'subsection':
        const subsectionContent = element.items.join('\n');
        return `--- ${element.title} ---\n${subsectionContent}\n`;

      case 'material':
        return `[Material: ${element.title}]\n${element.content}\n`;

      case 'chunk':
        return `[Chunk ${element.index}/${element.total} of ${element.partOf}]\n${element.content}\n`;

      default:
        // 未知の要素はテキストとして扱う
        return JSON.stringify(element);
    }
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

    // Output section
    if (prompt.output.length > 0) {
      const outputTexts = await Promise.all(
        prompt.output.map(el => this.formatElementWithTokens(el))
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
    let processedMessages = [...messages];

    // Tanuki-8B-dpo-v1 固有処理
    if (this.modelName.indexOf('Tanuki-8B-dpo-v1') !== -1) {
      processedMessages = [
        {
          role: 'system',
          content: '以下は、タスクを説明する指示です。要求を適切に満たす応答を書きなさい。\\n',
        } as const,
        ...processedMessages,
        {
          role: 'user',
          content: 'systemプロンプトで説明されたタスクを正確に実行し、Output Sectionに書かれるべき内容を出力してください。\\n',
        } as const,
      ];
      processedMessages = mergeSystemMessages(processedMessages);
    }
    // CodeLlama 固有処理
    else if (this.modelName.indexOf('mlx-community/CodeLlama') !== -1) {
      processedMessages = mergeSystemMessages(processedMessages);
      // userがない場合は必要
      if (processedMessages[processedMessages.length - 1].role !== 'user') {
        processedMessages.push({
          role: 'user',
          content: 'Read the system prompt and output the appropriate content.',
        } as const);
      }
    }
    // Gemma-3 固有処理
    else if (this.modelName.indexOf('mlx-community/gemma-3') !== -1) {
      processedMessages = mergeSystemMessages(processedMessages);
      // (system) => user => assistant => user => ... と、きれいに並んでいないとエラーになる。
      if (processedMessages[processedMessages.length - 1].role !== 'user') {
        processedMessages.push({
          role: 'user',
          content: 'Read the system prompt and output the appropriate content.',
        } as const);
      }
    }

    return processedMessages;
  }

  /**
   * Completion API用のモデル固有処理
   * モデルごとにブロック化トークンやプロンプトフォーマットを適用
   */
  applyCompletionSpecificProcessing(prompt: string): string {
    if (this.modelName.indexOf('llm-jp-3.1') !== -1) {
      return [
        '<s>\\n\\n### 指示:',
        '指示は英語と日本語の混ぜ書きになっています。以下の指示書(prompt)を丁寧に読んで実行してください。',
        '',
        prompt,
        '\\n### 応答:',
      ].join('\\n');
    }

    // Tanuki-8B用のcompletion処理
    if (this.modelName.indexOf('Tanuki-8B') !== -1) {
      // completion APIではブロック化トークンを使用可能
      return `### システム:\n${prompt}\n\n### 応答:\n`;
    }

    // CodeLlama用のcompletion処理
    if (this.modelName.indexOf('CodeLlama') !== -1) {
      // completion APIでは直接プロンプトを使用
      return prompt;
    }

    // Gemma-3用のcompletion処理
    if (this.modelName.indexOf('gemma-3') !== -1) {
      // Gemma-3はchat形式に依存しないcompletion処理が可能
      return `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>model\n`;
    }

    // デフォルトはそのまま返す
    return prompt;
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