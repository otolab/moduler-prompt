/**
 * AI chat functionality using Moduler Prompt
 */

import { compile, PromptModule } from '@moduler-prompt/core';
import { MlxDriver, type AIDriver } from '@moduler-prompt/driver';
import { DialogProfile, ChatLog } from './types.js';
import chalk from 'chalk';

/**
 * Chat context interface
 */
export interface ChatContext {
  messages: Array<{ role: string; content: string }>;
  resourceContent?: string;
  userMessage: string;
}

/**
 * Chat prompt module template (static definition)
 */
export const chatPromptModule: PromptModule<ChatContext> = {
  // Objective and Role
  objective: [
    'チャットアシスタントとして、ユーザーとの対話を行う',
    'ユーザーの質問や要求に対して、適切で有用な応答を提供する'
  ],
  
  // Instructions - 具体的な指示
  instructions: [
    '日本語で応答してください',
    'ユーザーの質問の意図を理解し、的確に回答してください',
    '必要に応じて具体例を提示してください',
    {
      type: 'subsection',
      content: '',
      title: '応答形式',
      items: [
        '簡潔で明確な説明を心がける',
        '専門用語は分かりやすく解説する',
        '段階的に説明する'
      ]
    }
  ],
  
  // Guidelines - 制約や注意事項
  guidelines: [
    'ユーザーの理解度に合わせて説明のレベルを調整する',
    '不確実な情報は明確に伝える',
    '適切な敬語を使用する'
  ],
  
  // Materials - 参考資料（もしあれば）
  materials: [
    (ctx) => ctx.resourceContent ? [
      '=== 参考資料 ===',
      ctx.resourceContent
    ] : null
  ],
  
  // Messages - 会話履歴
  messages: [
    (ctx) => {
      if (ctx.messages.length === 0) {
        return null;
      }
      // 最新10件の会話履歴を含める
      const recentMessages = ctx.messages.slice(-10);
      return recentMessages.map(m => `${m.role}: ${m.content}`);
    }
  ],
  
  // Cue - 出力の開始
  cue: [
    (ctx) => `user: ${ctx.userMessage}`,
    '',
    'assistant:'
  ]
};

/**
 * Create MLX driver
 */
export function createDriver(profile: DialogProfile): AIDriver {
  return new MlxDriver({
    model: profile.model,
    defaultOptions: profile.options,
  });
}

/**
 * Perform AI chat
 */
export async function performAIChat(
  profile: DialogProfile,
  chatLog: ChatLog,
  userMessage: string,
  resourceContent?: string
): Promise<{ response: string; driver: AIDriver }> {
  const driver = createDriver(profile);
  
  try {
    // Create context - シンプルに必要なデータのみ
    const context: ChatContext = {
      messages: chatLog.messages.filter(m => m.role !== 'system'),
      resourceContent,
      userMessage
    };
    
    // Compile static module with context
    const compiledPrompt = compile(chatPromptModule, context);
    
    // Query AI with streaming
    if (driver.streamQuery) {
      console.log(chalk.cyan('\nAssistant: '));
      
      let response = '';
      for await (const chunk of driver.streamQuery(compiledPrompt, profile.options)) {
        process.stdout.write(chunk);
        response += chunk;
      }
      console.log('\n');
      
      return { response, driver };
    } else {
      // Fallback to non-streaming
      const result = await driver.query(compiledPrompt, profile.options);
      console.log(chalk.cyan('\nAssistant: ') + result.content + '\n');
      return { response: result.content, driver };
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ AI chat error: ${error}`));
    throw error;
  }
}

/**
 * Close driver connection
 */
export async function closeDriver(driver: AIDriver): Promise<void> {
  if (driver.close) {
    await driver.close();
  }
}