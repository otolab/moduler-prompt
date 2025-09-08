/**
 * Dialog profile management
 */

import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import { DialogProfile } from './types.js';

/**
 * Get default profile
 */
export function getDefaultProfile(): DialogProfile {
  return {
    model: 'mlx-community/gemma-3-270m-it-qat-4bit',
    driver: 'mlx',
    systemPrompt: 'あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、正確で分かりやすい回答を提供してください。日本語で応答してください。',
    options: {
      temperature: 0.7,
      maxTokens: 4000,
      topP: 0.9,
    },
  };
}

/**
 * Load dialog profile from file
 */
export async function loadDialogProfile(profilePath: string): Promise<DialogProfile> {
  try {
    const content = await readFile(profilePath, 'utf-8');
    const profile = yaml.load(content) as DialogProfile;
    return profile;
  } catch (error) {
    throw new Error(`Failed to load dialog profile from ${profilePath}: ${error}`);
  }
}

/**
 * Generate profile template
 */
export function generateProfileTemplate(): string {
  return `# Dialog Profile Configuration
# Settings for simple-chat application

# Model name to use
model: "mlx-community/gemma-3-270m-it-qat-4bit"

# Driver type (openai, anthropic, vertexai, ollama, mlx)
driver: "mlx"

# System prompt
systemPrompt: |
  あなたは親切で知識豊富なAIアシスタントです。
  ユーザーの質問に対して、正確で分かりやすい回答を提供してください。
  日本語で応答してください。

# Pre-message from assistant (optional)
# Initial message sent automatically when starting a new conversation
preMessage: |
  こんにちは！何でもお気軽にお聞きください。
  技術的な質問から日常的な話題まで、丁寧にお手伝いします。

# Resource files to include (optional)
# Relative paths from the profile file location
# resourceFiles:
#   - ./context/guidelines.md
#   - ./context/examples.txt

# Model options
options:
  temperature: 0.7
  maxTokens: 4000
  topP: 0.9
`;
}