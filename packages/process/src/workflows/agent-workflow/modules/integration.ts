import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';

/**
 * Integration phase module for agent workflow
 * Phase-specific definitions for integrating all step results
 *
 * Should be merged with user's module:
 *   merge(integration, userModule)
 */
export const integration: PromptModule<AgentWorkflowContext> = {
  methodology: [
    {
      type: 'subsection',
      title: '統合フェーズの処理',
      items: [
        '全ステップの実行結果を統合し、最終的な出力を生成する',
        'objectiveが達成されたか確認する',
        'instructionsで指定された出力形式に従う',
        '各ステップの重要な結果を明確に記述する'
      ]
    }
  ],

  state: [
    (ctx) => {
      const completed = ctx.executionLog?.length || 0;
      const total = ctx.plan?.steps.length || 0;
      return `全 ${total} ステップ完了。最終出力を生成します。`;
    }
  ],

  chunks: [
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      return ctx.executionLog.map((log, index) => {
        let content = `[${log.stepId}]\n${log.result}`;

        if (log.actionResult !== undefined) {
          const actionResultStr = typeof log.actionResult === 'string'
            ? log.actionResult
            : JSON.stringify(log.actionResult, null, 2);
          content += `\n\n[アクション結果]\n${actionResultStr}`;
        }

        return {
          type: 'chunk' as const,
          partOf: 'execution-results',
          index: index + 1,
          total: ctx.executionLog!.length,
          content
        };
      });
    }
  ],

  materials: [
    (ctx) => {
      if (!ctx.plan) {
        return null;
      }

      return {
        type: 'material' as const,
        id: 'original-plan',
        title: '当初の実行計画',
        content: ctx.plan.steps.map((step, index) =>
          `${index + 1}. [${step.id}] ${step.description}` +
          (step.action ? ` (アクション: ${step.action})` : '')
        ).join('\n')
      };
    }
  ]
};
