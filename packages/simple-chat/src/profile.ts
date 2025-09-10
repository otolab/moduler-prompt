/**
 * Dialog profile management using PromptModule
 */

import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import type { DialogProfile } from './types.js';

/**
 * Get default profile
 */
export function getDefaultProfile(): DialogProfile {
  return {
    // modelは指定しない（デフォルトドライバを使用）
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