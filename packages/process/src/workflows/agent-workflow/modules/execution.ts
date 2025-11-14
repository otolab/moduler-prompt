import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';

/**
 * Execution phase module for agent workflow
 * Phase-specific definitions for executing a single step
 *
 * Should be merged with user's module:
 *   merge(execution, userModule)
 */
export const execution: PromptModule<AgentWorkflowContext> = {
  methodology: [
    {
      type: 'subsection',
      title: '実行フェーズの処理',
      items: [
        (ctx) => ctx.currentStep
          ? `現在のステップ「${ctx.currentStep.description}」を実行する`
          : '現在のステップを実行する',
        'instructionsの中から現在のステップに関連する指示を実行',
        'アクション結果がある場合はそれを活用',
        '結果(result)と次への申し送り(nextState)を構造化して出力'
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
      if (ctx.currentStep) {
        return `現在のステップ: ${ctx.currentStep.id} - ${ctx.currentStep.description}`;
      }
      return null;
    },
    (ctx) => {
      if (ctx.state) {
        return `前ステップからの申し送り: ${ctx.state.content}`;
      }
      return null;
    }
  ],

  chunks: [
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      return ctx.executionLog.map((log, index) => ({
        type: 'chunk' as const,
        partOf: 'execution-results',
        index: index + 1,
        total: ctx.executionLog!.length,
        content: `[${log.stepId}]\n${log.result}`
      }));
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
