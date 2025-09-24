/**
 * モデル固有の処理ハンドラー
 *
 * 各モデル特有のメッセージ変換やプロンプト生成処理を管理
 */

import type { MlxMessage } from './types.js';

/**
 * システムメッセージをマージ（末尾の改行をtrim）
 */
export function mergeSystemMessages(msgs: MlxMessage[]): MlxMessage[] {
  let systemContent = '';
  const conversation: MlxMessage[] = [];

  for (const msg of msgs) {
    if (msg.role === 'system') {
      systemContent += msg.content + '\n\n';
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

/**
 * システムメッセージをマージ（末尾の改行を保持）
 */
function mergeSystemMessagesRaw(msgs: MlxMessage[]): MlxMessage[] {
  const systemMessages: string[] = [];
  const conversation: MlxMessage[] = [];

  for (const msg of msgs) {
    if (msg.role === 'system') {
      systemMessages.push(msg.content);
    } else {
      conversation.push(msg);
    }
  }

  if (systemMessages.length > 0) {
    const systemMessage: MlxMessage = {
      role: 'system',
      content: systemMessages.join('\n\n')
    };
    return [systemMessage, ...conversation];
  }
  return conversation;
}

/**
 * Tanuki-8B-dpo-v1用のChat処理
 */
export function processTanukiChat(messages: MlxMessage[]): MlxMessage[] {
  // まずsystemメッセージをマージ（改行を保持）
  const mergedMessages = mergeSystemMessagesRaw(messages);

  const result: MlxMessage[] = [];

  // systemメッセージにプレフィックスを追加
  if (mergedMessages.length > 0 && mergedMessages[0].role === 'system') {
    result.push({
      role: 'system',
      content: '以下は、タスクを説明する指示です。要求を適切に満たす応答を書きなさい。\n\n' + mergedMessages[0].content
    });
    result.push(...mergedMessages.slice(1));
  } else {
    // systemメッセージがない場合
    result.push({
      role: 'system',
      content: '以下は、タスクを説明する指示です。要求を適切に満たす応答を書きなさい。\n'
    });
    result.push(...mergedMessages);
  }

  // 最後にuserメッセージを追加
  result.push({
    role: 'user',
    content: 'systemプロンプトで説明されたタスクを正確に実行し、Output Sectionに書かれるべき内容を出力してください。\n'
  });

  return result;
}

/**
 * CodeLlama用のChat処理
 */
export function processCodeLlamaChat(messages: MlxMessage[]): MlxMessage[] {
  const processedMessages = mergeSystemMessages(messages);
  // userがない場合は必要
  if (processedMessages[processedMessages.length - 1].role !== 'user') {
    processedMessages.push({
      role: 'user',
      content: 'Read the system prompt and output the appropriate content.',
    } as const);
  }
  return processedMessages;
}

/**
 * Gemma-3用のChat処理
 */
export function processGemmaChat(messages: MlxMessage[]): MlxMessage[] {
  const processedMessages = mergeSystemMessages(messages);
  // (system) => user => assistant => user => ... と、きれいに並んでいないとエラーになる。
  if (processedMessages[processedMessages.length - 1].role !== 'user') {
    processedMessages.push({
      role: 'user',
      content: 'Read the system prompt and output the appropriate content.',
    } as const);
  }
  return processedMessages;
}

/**
 * llm-jp-3.1用のCompletion処理
 */
export function processLlmJpCompletion(prompt: string): string {
  // 各行を配列で管理し、\nで結合
  return '<s>\n\n### 指示:\n' +
    '指示は英語と日本語の混ぜ書きになっています。以下の指示書(prompt)を丁寧に読んで実行してください。\n' +
    '\n' +
    prompt + '\n' +
    '\n### 応答:';
}

/**
 * Tanuki-8B用のCompletion処理
 */
export function processTanukiCompletion(prompt: string): string {
  // completion APIではブロック化トークンを使用可能
  return `### システム:\n${prompt}\n\n### 応答:\n`;
}

/**
 * Gemma-3用のCompletion処理
 */
export function processGemmaCompletion(prompt: string): string {
  // Gemma-3はchat形式に依存しないcompletion処理が可能
  return `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>model\n`;
}

/**
 * モデル名に基づいてChat処理を選択
 */
export function selectChatProcessor(modelName: string): ((messages: MlxMessage[]) => MlxMessage[]) | null {
  if (modelName.includes('Tanuki-8B-dpo-v1')) {
    return processTanukiChat;
  }
  if (modelName.includes('mlx-community/CodeLlama')) {
    return processCodeLlamaChat;
  }
  if (modelName.includes('mlx-community/gemma-3')) {
    return processGemmaChat;
  }
  return null;
}

/**
 * モデル名に基づいてCompletion処理を選択
 */
export function selectCompletionProcessor(modelName: string): ((prompt: string) => string) | null {
  if (modelName.includes('llm-jp-3.1')) {
    return processLlmJpCompletion;
  }
  if (modelName.includes('Tanuki-8B')) {
    return processTanukiCompletion;
  }
  if (modelName.includes('CodeLlama')) {
    // CodeLlamaはそのまま返す
    return (prompt: string) => prompt;
  }
  if (modelName.includes('gemma-3')) {
    return processGemmaCompletion;
  }
  return null;
}