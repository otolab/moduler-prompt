import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';

/**
 * Common module for agent workflow
 * Shared definitions across all phases (planning, execution, integration)
 *
 * Should be merged first:
 *   merge(common, planning, userModule)
 *   merge(common, execution, userModule)
 *   merge(common, integration, userModule)
 */
export const common: PromptModule<AgentWorkflowContext> = {
  terms: [
    '- Objective: 最終的に達成すべきゴール',
    '- Instructions: タスク達成のための具体的な指示や要件',
    '- 実行計画: Instructionsを実行可能なステップに分解したもの',
    '- Action: ステップ実行時に外部処理（API呼び出し、データ取得など）を行う機能'
  ],

  methodology: [
    'このワークフローは3つのフェーズで構成されます：',
    '1. Planning: Objective（目標）とInstructions（指示）を分析し、実行可能なステップに分解した実行計画を生成',
    '2. Execution: 実行計画の各ステップを順次実行し、結果を記録',
    '3. Integration: 全ステップの実行結果を統合し、最終的な出力を生成'
  ]
};
