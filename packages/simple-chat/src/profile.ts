/**
 * Dialog profile management using PromptModule
 */

import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import { PromptModule } from '@moduler-prompt/core';
import { DialogProfile } from './types.js';

/**
 * Default system prompt module (static template)
 */
export const defaultSystemModule: PromptModule = {
  objective: [
    'あなたは親切で知識豊富なAIアシスタントです。',
    'ユーザーの質問に対して、正確で分かりやすい回答を提供してください。',
  ],
  guidelines: [
    '日本語で応答してください',
    {
      type: 'subsection',
      content: '',
      title: '応答スタイル',
      items: [
        '簡潔で明確な説明',
        '必要に応じて具体例を提示',
        '専門用語は分かりやすく解説'
      ]
    }
  ]
};

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