import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';

/**
 * Agentic module - Common definitions for agent workflow
 * Defines the basic behavior and terminology for agentic processing
 *
 * This module should be merged with user's module:
 *   agentProcess(driver, merge(agenticModule, userModule), context)
 */
export const agentic: PromptModule<AgentWorkflowContext> = {
  terms: [
    'instructions: Objectiveを果たすための具体的な指示。ステップ実行の手順は別途methodologyで与えられる。'
  ],

  methodology: [
    {
      type: 'subsection',
      title: 'エージェント的処理の基本',
      items: [
        '複雑なタスクを段階的に実行する多段階処理',
        '各ステップの結果は次のステップに引き継がれる',
        '全ステップの結果を統合して最終的な出力を生成'
      ]
    }
  ]
};
