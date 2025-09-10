/**
 * AI chat functionality using Moduler Prompt
 */

import type { PromptModule} from '@moduler-prompt/core';
import { compile, createContext, merge } from '@moduler-prompt/core';
import { withMaterials, type MaterialContext } from '@moduler-prompt/process';
import { type AIDriver, MlxDriver } from '@moduler-prompt/driver';
import { DriverRegistry } from '@moduler-prompt/utils';
import type { DialogProfile, ChatLog } from './types.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Chat context interface
 */
export interface ChatContext extends MaterialContext {
  messages: Array<{ role: string; content: string }>;
  userMessage: string;
  systemPrompt?: string;
}

/**
 * Base chat prompt module (without materials)
 */
const baseChatModule: PromptModule<ChatContext> = {
  // Context factory - returns empty typed context
  createContext: (): ChatContext => ({
    messages: [],
    userMessage: ''
  }),
  
  // Objective and Role
  objective: [
    (ctx) => ctx.systemPrompt ? [
      ctx.systemPrompt,
      ''  // 空行で区切る
    ] : [
      'チャットアシスタントとして、ユーザーとの対話を行う',
      'ユーザーの質問や要求に対して、適切で有用な応答を提供する'
    ]
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
 * Chat prompt module with materials support (merged)
 */
export const chatPromptModule = merge(baseChatModule, withMaterials);

// ドライバレジストリのシングルトンインスタンス
let driverRegistry: DriverRegistry | null = null;

/**
 * Initialize driver registry
 */
async function initializeRegistry(): Promise<DriverRegistry> {
  if (driverRegistry) {
    return driverRegistry;
  }
  
  driverRegistry = new DriverRegistry();
  
  // デフォルト設定ファイルを読み込み
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const configPath = join(__dirname, '..', 'drivers.yaml');
  
  try {
    await driverRegistry.loadConfig(configPath);
  } catch {
    console.warn(chalk.yellow('Warning: drivers.yaml not found, using built-in defaults'));
    // デフォルトドライバを手動で登録
    driverRegistry.registerDriver({
      id: 'mlx-default',
      name: 'MLX Default',
      model: {
        model: 'mlx-community/gemma-3-270m-it-qat-4bit',
        provider: 'mlx',
        capabilities: ['local', 'streaming', 'chat'],
        enabled: true
      }
    });
  }
  
  return driverRegistry;
}

/**
 * Create driver from profile
 */
export async function createDriver(profile: DialogProfile, customRegistry?: DriverRegistry): Promise<AIDriver> {
  const registry = customRegistry || await initializeRegistry();
  
  // プロファイルで明示的にモデルが指定されている場合
  if (profile.model) {
    // 指定されたモデルのドライバを探す
    const drivers = registry.getAllDrivers();
    const driver = drivers.find((d: any) => d.model.model === profile.model);
    
    if (driver) {
      return await registry.createDriver(driver);
    }
    
    // 見つからない場合は、MLXドライバとして直接作成を試みる
    console.warn(chalk.yellow(`Model ${profile.model} not found in registry, attempting direct creation`));
    return new MlxDriver({
      model: profile.model,
      defaultOptions: profile.options
    });
  }
  
  // モデルが指定されていない場合、デフォルトドライバを使用
  const defaultDriver = registry.getDefaultDriver();
  if (!defaultDriver) {
    throw new Error('No default driver configured');
  }
  
  return await registry.createDriver(defaultDriver);
}

/**
 * Perform AI chat
 */
export async function performAIChat(
  profile: DialogProfile,
  chatLog: ChatLog,
  userMessage: string,
  materials?: MaterialContext['materials'],
  customRegistry?: DriverRegistry
): Promise<{ response: string; driver: AIDriver }> {
  const driver = await createDriver(profile, customRegistry);
  
  try {
    // Create empty typed context from module
    const context = createContext(chatPromptModule);
    
    // Populate context with actual data
    context.messages = chatLog.messages.filter(m => m.role !== 'system');
    context.userMessage = userMessage;
    context.materials = materials;
    context.systemPrompt = profile.systemPrompt;
    
    // Compile module with populated context
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