/**
 * AI chat functionality using Moduler Prompt
 */

import { compile, merge, PromptModule } from '@moduler-prompt/core';
import { 
  MlxDriver, 
  OpenAIDriver, 
  AnthropicDriver, 
  VertexAIDriver,
  OllamaDriver,
  type AIDriver 
} from '@moduler-prompt/driver';
import { DialogProfile, ChatLog } from './types.js';
import chalk from 'chalk';

/**
 * Create AI driver based on profile
 */
export function createDriver(profile: DialogProfile): AIDriver {
  const driverType = profile.driver || 'mlx';
  
  switch (driverType) {
    case 'mlx':
      return new MlxDriver({
        model: profile.model,
        defaultOptions: profile.options,
      });
      
    case 'openai':
      return new OpenAIDriver({
        model: profile.model,
        apiKey: process.env.OPENAI_API_KEY!,
        defaultOptions: profile.options,
      });
      
    case 'anthropic':
      return new AnthropicDriver({
        model: profile.model,
        apiKey: process.env.ANTHROPIC_API_KEY!,
        defaultOptions: profile.options,
      });
      
    case 'vertexai':
      return new VertexAIDriver({
        model: profile.model,
        project: process.env.VERTEX_AI_PROJECT!,
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
        defaultOptions: profile.options,
      });
      
    case 'ollama':
      return new OllamaDriver({
        model: profile.model,
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultOptions: profile.options,
      });
      
    default:
      throw new Error(`Unknown driver type: ${driverType}`);
  }
}

/**
 * Build prompt module from chat log and user message
 */
export function buildPromptModule(
  profile: DialogProfile,
  chatLog: ChatLog,
  userMessage: string,
  resourceContent?: string
): PromptModule {
  // System prompt module
  const systemModule: PromptModule = {
    instructions: [profile.systemPrompt],
  };
  
  // Add resource files if provided
  if (resourceContent) {
    systemModule.materials = [resourceContent];
  }
  
  // Chat history module  
  const historyModule: PromptModule = {
    messages: chatLog.messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`),
  };
  
  // User message module
  const userModule: PromptModule = {
    cue: [`user: ${userMessage}`],
  };
  
  // Merge all modules
  return merge(systemModule, historyModule, userModule);
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
    
    // Compile to structured prompt
    const compiledPrompt = compile(promptModule);
    
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