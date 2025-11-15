import { merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';
import { common } from './common.js';

/**
 * Planning phase module for agent workflow
 * Phase-specific definitions for generating execution plan
 *
 * Should be merged with user's module:
 *   merge(planning, userModule)
 */
const planningBase: PromptModule<AgentWorkflowContext> = {
  methodology: [
    '',
    '現在はPlanningフェーズです。Objective（目標）とInstructions（指示）を分析し、実行可能なステップに分解した実行計画を生成してください。'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planningフェーズの処理',
      items: [
        '- objectiveとinstructionsを分析し、実行可能なステップに分解する',
        '- 各ステップには一意のID、説明、必要に応じてアクションとパラメータを含める',
        '- ステップ数は3〜5個程度を目安とする'
      ]
    },
    {
      type: 'subsection',
      title: '利用可能なAction',
      items: [
        '- 利用可能なActionはありません'
      ]
    }
  ],

  inputs: [
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
  ],

  state: [
    'フェーズ: planning'
  ],

  schema: [
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ステップの一意なID（例: step-1, step-2）'
                },
                description: {
                  type: 'string',
                  description: 'ステップの説明（何をするか）'
                },
                action: {
                  type: 'string',
                  description: 'アクション名（オプション）。利用可能なアクションがあれば指定'
                },
                params: {
                  type: 'object',
                  description: 'アクションのパラメータ（オプション）'
                }
              },
              required: ['id', 'description']
            },
            description: '実行計画のステップリスト'
          }
        },
        required: ['steps']
      }
    }
  ]
};

export const planning = merge(common, planningBase);
