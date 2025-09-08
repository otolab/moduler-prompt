/**
 * AI chat functionality using Moduler Prompt
 */

import { compile, merge, PromptModule, createContext } from '@moduler-prompt/core';
import { MlxDriver, type AIDriver } from '@moduler-prompt/driver';
import { DialogProfile, ChatLog } from './types.js';
import chalk from 'chalk';

/**
 * Chat context interface
 */
interface ChatContext {
  messages: Array<{ role: string; content: string }>;
  resourceContent?: string;
}

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
 * Build prompt module from profile and user message
 */
export function buildPromptModule(
  profile: DialogProfile,
  chatLog: ChatLog,
  userMessage: string,
  resourceContent?: string
): PromptModule<ChatContext> {
  // Create context with chat history and resources
  const contextModule: PromptModule<ChatContext> = {
    createContext: () => ({
      messages: [
        ...chatLog.messages.filter(m => m.role !== 'system'),
        { role: 'user', content: userMessage }
      ],
      resourceContent
    })
  };
  
  // System instructions module
  const systemModule: PromptModule<ChatContext> = {
    objective: [
      'AIアシスタントとしてユーザーをサポートする',
      profile.systemPrompt,
    ],
    guidelines: [
      '日本語で応答する',
      '簡潔で明確な説明を心がける',
      '必要に応じて具体例を提示する',
      {
        type: 'subsection',
        content: '',
        title: '応答スタイル',
        items: [
          '専門用語は分かりやすく解説',
          '段階的に説明する',
          'ユーザーの理解度に合わせる'
        ]
      }
    ],
  };
  
  // Materials module (if resources provided)
  const materialsModule: PromptModule<ChatContext> = resourceContent ? {
    materials: [
      (ctx) => ctx.resourceContent ? [
        '参考資料:',
        ...ctx.resourceContent.split('\n---\n')
      ] : null
    ]
  } : {};
  
  // Chat history module using DynamicContent
  const historyModule: PromptModule<ChatContext> = {
    messages: [
      // Use DynamicContent to inject messages from context
      (ctx) => {
        if (ctx.messages.length === 0) {
          return null;
        }
        // Take last 10 messages for context window
        const recentMessages = ctx.messages.slice(-10);
        return recentMessages.map(m => `${m.role}: ${m.content}`);
      }
    ],
  };
  
  // Output cue module
  const outputModule: PromptModule<ChatContext> = {
    cue: [
      '', // Empty line for spacing
      'assistant:' // Prompt for assistant response
    ]
  };
  
  // Merge all modules with context first
  return merge(
    contextModule,
    systemModule,
    materialsModule,
    historyModule,
    outputModule
  );
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
    // Build prompt module
    const promptModule = buildPromptModule(profile, chatLog, userMessage, resourceContent);
    
    // Create context from module
    const context = createContext(promptModule);
    
    // Compile module with context to get structured prompt
    const compiledPrompt = compile(promptModule, context);
    
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