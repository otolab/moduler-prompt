/**
 * Main chat processing
 */

/* eslint-disable no-console */

import { readFileSync } from 'fs';
import chalk from 'chalk';
import type {
  DialogProfile,
  ChatLog,
  SimpleChatOptions
} from './types.js';
import {
  getDefaultProfile,
  loadDialogProfile,
} from './profile.js';
import {
  createChatLog,
  loadChatLog,
  saveChatLog,
  addMessage,
  getChatLogStats,
} from './chat-log.js';
import {
  performAIChat,
  closeDriver,
} from './ai-chat.js';
import { loadResourceFiles } from './resource-files.js';
import type { MaterialContext } from '@modular-prompt/process';
import { Spinner } from './spinner.js';

/**
 * Process user input
 */
async function getUserMessage(options: SimpleChatOptions): Promise<string> {
  if (options.userMessage) {
    return options.userMessage;
  }
  
  if (options.useStdin) {
    try {
      const input = readFileSync(0, 'utf-8');
      return input.trim();
    } catch {
      throw new Error('Failed to read from stdin');
    }
  }
  
  throw new Error('No user message provided');
}

/**
 * Display chat log
 */
function displayChatLog(chatLog: ChatLog): void {
  const stats = getChatLogStats(chatLog);
  
  console.log(chalk.blue('\n=== Chat Log ==='));
  console.log(chalk.gray(`Session ID: ${stats.sessionId}`));
  console.log(chalk.gray(`Started at: ${stats.startedAt}`));
  console.log(chalk.gray(`Total messages: ${stats.totalMessages}`));
  console.log();
  
  for (const message of chatLog.messages) {
    const roleColor = 
      message.role === 'user' ? chalk.green :
      message.role === 'assistant' ? chalk.cyan :
      chalk.yellow;
    
    console.log(roleColor(`[${message.role}]`));
    console.log(message.content);
    
    if (message.resourceFiles && message.resourceFiles.length > 0) {
      console.log(chalk.gray(`  Resources: ${message.resourceFiles.join(', ')}`));
    }
    
    console.log();
  }
}

/**
 * Run chat session
 */
export async function runChat(options: SimpleChatOptions): Promise<void> {
  // Show log only mode
  if (options.showLogOnly && options.logPath) {
    const chatLog = await loadChatLog(options.logPath);
    displayChatLog(chatLog);
    return;
  }
  
  // Load or create profile
  let profile: DialogProfile;
  if (options.profilePath) {
    profile = await loadDialogProfile(options.profilePath);
  } else {
    profile = getDefaultProfile();
  }
  
  // Apply overrides
  if (options.model) profile.model = options.model;
  if (options.temperature !== undefined) {
    profile.options = profile.options || {};
    profile.options.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    profile.options = profile.options || {};
    profile.options.maxTokens = options.maxTokens;
  }
  
  // Load or create chat log
  let chatLog: ChatLog;
  if (options.logPath) {
    try {
      chatLog = await loadChatLog(options.logPath);
      // Update profile in existing log
      chatLog.profile = profile;
    } catch {
      // Create new log if file doesn't exist
      chatLog = createChatLog(profile);
    }
  } else {
    chatLog = createChatLog(profile);
  }
  
  // Add system message if this is a new session
  if (chatLog.messages.length === 0) {
    addMessage(chatLog, 'system', profile.systemPrompt);
    
    // Add pre-message if defined
    if (profile.preMessage) {
      addMessage(chatLog, 'assistant', profile.preMessage);
      console.log(chalk.cyan('Assistant: ') + profile.preMessage);
    }
  }
  
  // Get user message
  const userMessage = await getUserMessage(options);
  
  // Load resource files as materials
  let materials: MaterialContext['materials'];
  let loadedFiles: string[] = [];
  if (profile.resourceFiles && profile.resourceFiles.length > 0) {
    const spinner = new Spinner();
    spinner.start('Loading resource files...');

    const resourceResult = await loadResourceFiles(
      profile.resourceFiles,
      options.profilePath
    );
    materials = resourceResult.materials;
    loadedFiles = resourceResult.loadedFiles;

    spinner.stop();
    if (loadedFiles.length > 0) {
      console.log(chalk.gray(`✓ Loaded ${loadedFiles.length} resource file(s)`));
    }
  }
  
  // Add user message to log
  addMessage(chatLog, 'user', userMessage, loadedFiles);
  console.log(chalk.green('\nUser: ') + userMessage);
  
  // Perform AI chat with optional custom drivers config
  const { response, driver } = await performAIChat(
    profile,
    chatLog,
    userMessage,
    materials,
    undefined  // customRegistry
  );
  
  // Add assistant response to log
  addMessage(chatLog, 'assistant', response);
  
  // Save chat log if path is specified
  if (options.logPath) {
    await saveChatLog(chatLog, options.logPath);
    console.log(chalk.gray(`\n💾 Chat log saved to: ${options.logPath}`));
  }
  
  // Close driver
  await closeDriver(driver);
}