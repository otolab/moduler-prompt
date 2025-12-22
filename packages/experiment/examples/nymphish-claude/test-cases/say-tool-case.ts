/**
 * Test case for say tool (COEIROINK operator)
 *
 * Scenario: User asks for a notification when work is completed
 */

import type { AnalysisResult } from '../../../src/prompts/analysis-module.js';
import type { RelevantContextItem, ToolDefinition } from '../../../src/types/tools.js';

/**
 * Tool definition for say (COEIROINK operator)
 */
export const sayToolDefinition: ToolDefinition = {
  name: 'mcp__plugin_coeiro-operator_coeiro-operator__say',
  description: '日本語音声を非同期で出力します',
  input_schema: {
    type: 'object',
    properties: {
      speechText: {
        description: 'Text to speak (Japanese)',
        type: 'string'
      },
      characterId: {
        description: 'Character ID (defaults to current operator if omitted)',
        type: 'string'
      },
      styleName: {
        description: 'Style name (e.g., "のーまる", defaults to character\'s default style if omitted)',
        type: 'string'
      },
      factor: {
        description: 'Relative speed multiplier (1.0 = normal speed, defaults to character\'s natural speed if omitted)',
        type: 'number'
      },
      rate: {
        description: 'Absolute speed in WPM (200 = standard, defaults to config value if omitted)',
        type: 'number'
      }
    },
    required: ['speechText']
  }
};

/**
 * Test case: User requests notification when work is done
 */
export const testCase1 = {
  name: 'Simple completion notification',
  description: 'User asks to be notified when work is completed',

  analysisResult: {
    analysis: {
      userRequest: '作業が終わったら通知してください',
      userIntent: 'ユーザーは作業完了時に音声通知を受け取りたい',
      relevantContext: [],
      keyFacts: [
        '現在のオペレータ: dia',
        '作業: ファイルの整理作業',
        '通知内容: 作業完了の報告'
      ],
    },
    action: {
      type: 'tool_call' as const,
      reasoning: 'ユーザーが通知を要求しているため、sayツールで音声通知を行う'
    },
  } satisfies AnalysisResult,

  relevantContext: [
    {
      label: 'user',
      text: '大量のファイルを整理しています。終わったら教えてください。'
    },
    {
      label: 'assistant',
      text: 'わかりました。ファイル整理を開始します。'
    }
  ] satisfies RelevantContextItem[],

  toolDefinition: sayToolDefinition,
};

/**
 * Test case: User requests notification with specific character
 */
export const testCase2 = {
  name: 'Notification with character specification',
  description: 'User wants notification from a specific character',

  analysisResult: {
    analysis: {
      userRequest: 'tsukuyomiで「調査が完了しました」と伝えて',
      userIntent: 'ユーザーは特定のキャラクター(tsukuyomi)で調査完了の通知を受け取りたい',
      relevantContext: [],
      keyFacts: [
        'キャラクター指定: tsukuyomi',
        '通知内容: 調査が完了しました',
      ],
    },
    action: {
      type: 'tool_call' as const,
      reasoning: 'ユーザーが特定のキャラクターでの通知を要求しているため、characterIdを指定してsayツールを呼び出す'
    },
  } satisfies AnalysisResult,

  relevantContext: [
    {
      label: 'user',
      text: 'この問題について調査してください'
    },
    {
      label: 'assistant',
      text: '調査を開始します'
    }
  ] satisfies RelevantContextItem[],

  toolDefinition: sayToolDefinition,
};

export const allTestCases = [testCase1, testCase2];
