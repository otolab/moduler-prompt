import { merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext, AgentStep } from '../types.js';
import { common } from './common.js';

/**
 * Integration phase module for agent workflow
 * Phase-specific definitions for integrating all step results
 *
 * Should be merged with user's module:
 *   merge(integration, userModule)
 */
const integrationBase: PromptModule<AgentWorkflowContext> = {
  methodology: [
    '',
    '現在はIntegrationフェーズです。全ステップの実行結果を統合し、全体目標を達成する最終的な出力を生成します。'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Integrationフェーズの処理',
      items: [
        '- 以下の「実行計画」の全ステップの実行結果を統合し、最終的な出力を生成する',
        '- objectiveが達成されたか確認する',
        '- 各ステップの重要な結果を明確に記述する'
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
      title: '実行計画（全ステップ完了）',
      items: [
        (ctx) => {
          if (!ctx.plan) {
            return null;
          }

          return ctx.plan.steps.map((step: AgentStep) => {
            const action = step.action ? ` (アクション: ${step.action})` : '';
            return `- ${step.description}${action}`;
          });
        }
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

  materials: [
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      return ctx.executionLog.map((log) => {
        let content = log.result;

        if (log.actionResult !== undefined) {
          const actionResultStr = typeof log.actionResult === 'string'
            ? log.actionResult
            : JSON.stringify(log.actionResult, null, 2);
          content += `\n\n[アクション結果]\n${actionResultStr}`;
        }

        return {
          type: 'material' as const,
          id: `execution-result-${log.stepId}`,
          title: `実行結果: ${log.stepId}`,
          content
        };
      });
    }
  ]
};

export const integration = merge(common, integrationBase);
