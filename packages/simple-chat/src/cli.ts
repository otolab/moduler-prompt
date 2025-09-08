#!/usr/bin/env node

/**
 * Simple Chat CLI
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runChat } from './chat.js';
import type { SimpleChatOptions } from './types.js';

// Get package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('simple-chat')
  .description('Simple chat application using Moduler Prompt with MLX models')
  .version(packageJson.version)
  .argument('[message...]', 'User message (use "-" for stdin)')
  .option('-p, --profile <path>', 'Dialog profile file path (YAML)')
  .option('-l, --log [path]', 'Chat log file path (JSON), show log if no message')
  .option('-m, --model <model>', 'Override model name')
  .option('-d, --driver <driver>', 'Driver type (currently only mlx)', 'mlx')
  .option('--temperature <value>', 'Temperature (0.0-2.0)', parseFloat)
  .option('--max-tokens <value>', 'Maximum tokens', parseInt)
  .option('--stdin', 'Read user message from stdin')
  .action(async (messageArgs: string[], options) => {
    try {
      // Check for stdin flag in message args
      const hasStdinFlag = messageArgs.includes('-');
      const userMessage = hasStdinFlag
        ? undefined
        : messageArgs.length > 0 ? messageArgs.join(' ') : undefined;
      
      // Show log only mode (when -l is specified without message)
      if (!messageArgs.length && options.log && !options.stdin && !hasStdinFlag) {
        const chatOptions: SimpleChatOptions = {
          logPath: options.log,
          showLogOnly: true,
        };
        await runChat(chatOptions);
        return;
      }
      
      // Normal chat mode
      const chatOptions: SimpleChatOptions = {
        profilePath: options.profile,
        logPath: options.log,
        userMessage,
        useStdin: hasStdinFlag || !!options.stdin,
        model: options.model,
        driver: options.driver,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      };
      
      await runChat(chatOptions);
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();