import { merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext, AgentStep } from '../types.js';
import { common } from './common.js';

/**
 * Execution phase module for agent workflow
 * Phase-specific definitions for executing a single step
 *
 * Should be merged with user's module:
 *   merge(execution, userModule)
 */
const executionBase: PromptModule<AgentWorkflowContext> = {
  methodology: [
    '',
    '現在はExecutionフェーズです。実行計画の現在のステップのみを実行し、結果を記録します。'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Executionフェーズの処理',
      items: [
        '- 以下の「実行計画」に記載された現在のステップのみを実行する',
        '- アクション結果がある場合はそれを活用',
        '- 結果(result)と次への申し送り(nextState)を構造化して出力'
      ]
    },
    {
      type: 'subsection',
      title: '利用可能なAction',
      items: [
        '- 利用可能なActionはありません'
      ]
    },
    {
      type: 'subsection',
      title: '実行計画',
      items: [
        (ctx) => {
          if (!ctx.plan) {
            return null;
          }

          const currentStepId = ctx.currentStep?.id;

          return ctx.plan.steps.map((step: AgentStep) => {
            const marker = step.id === currentStepId ? ' ← 現在実行中' : '';
            const action = step.action ? ` (アクション: ${step.action})` : '';
            return `- ${step.description}${action}${marker}`;
          });
        }
      ]
    }
  ],

  state: [
    (ctx) => {
      const completed = ctx.executionLog?.length || 0;
      const total = ctx.plan?.steps.length || 0;
      return `進捗: ${completed}/${total} ステップ完了`;
    },
    (ctx) => {
      if (ctx.state) {
        return `前ステップからの申し送り: ${ctx.state.content}`;
      }
      return null;
    }
  ],

  materials: [
    (ctx) => {
      if (ctx.actionResult === undefined) {
        return null;
      }

      return {
        type: 'material' as const,
        id: 'action-result',
        title: '現在のステップのアクション実行結果',
        content: typeof ctx.actionResult === 'string'
          ? ctx.actionResult
          : JSON.stringify(ctx.actionResult, null, 2)
      };
    },
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      return ctx.executionLog.map((log) => ({
        type: 'material' as const,
        id: `execution-result-${log.stepId}`,
        title: `実行結果: ${log.stepId}`,
        content: log.result
      }));
    }
  ],

  schema: [
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          result: {
            type: 'string',
            description: 'ステップの実行結果。何を行ったか、どのような結果が得られたかを記述'
          },
          nextState: {
            type: 'string',
            description: '次のステップへの申し送り事項。次のステップで必要となる情報、注意点、中間結果など'
          }
        },
        required: ['result', 'nextState']
      }
    }
  ]
};

export const execution = merge(common, executionBase);
