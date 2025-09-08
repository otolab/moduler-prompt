/**
 * MLX Driver モデル固有処理
 * 
 * モデルごとの特殊なフォーマット処理、メッセージ変換、プロンプト生成を管理
 * Python側のapply_model_specific_processingをTypeScript側に移行
 */

import type { MlxMessage } from './types.js';
import { formatMessagesAsPrompt } from '../../formatter/converter.js';
import type { ChatMessage } from '../../formatter/types.js';

export interface ModelSpecificProcessor {
  applyModelSpecificProcessing(messages: MlxMessage[]): MlxMessage[];
  applyCompletionSpecificProcessing(prompt: string): string;
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
  constructor(private modelName: string) {}

  /**
   * Python側のapply_model_specific_processingに対応
   * モデルごとのチャットフォーマットに合わせるための処理
   */
  applyModelSpecificProcessing(messages: MlxMessage[]): MlxMessage[] {
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
   * Python側のapply_completion_specific_processingに対応
   * completion用のモデル固有処理
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
export function createModelSpecificProcessor(modelName: string): ModelSpecificProcessor {
  // 将来的に異なるプロセッサーを返すことも可能
  return new DefaultModelSpecificProcessor(modelName);
}