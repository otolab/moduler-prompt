import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';

/**
 * Planning phase module for agent workflow
 * Phase-specific definitions for generating execution plan
 *
 * Should be merged with user's module:
 *   merge(planning, userModule)
 */
export const planning: PromptModule<AgentWorkflowContext> = {
  methodology: [
    {
      type: 'subsection',
      title: '計画フェーズの処理',
      items: [
        'objectiveとinstructionsを分析し、実行可能なステップに分解する',
        '各ステップには一意のID、説明、必要に応じてアクションとパラメータを含める',
        'ステップ数は3〜5個程度を目安とする'
      ]
    },
    {
      type: 'subsection',
      title: 'アクションの指定',
      items: [
        'アクションが必要な場合は、action フィールドにアクション名を指定',
        'アクションのパラメータは params フィールドに指定',
        'アクションが不要な場合は、AI推論のみで処理'
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
