/**
 * Action handler type for agent workflow
 */
export type ActionHandler<TContext = any> = (
  params: any,
  context: TContext
) => Promise<any>;

/**
 * Agent workflow step definition
 */
export interface AgentStep {
  id: string;
  description: string;
  action?: string;
  params?: any;
}

/**
 * Agent workflow execution log entry
 */
export interface AgentExecutionLog {
  stepId: string;
  result: string;
  actionResult?: any;
  metadata?: any;
}

/**
 * Agent workflow plan (structured output from planning phase)
 */
export interface AgentPlan {
  steps: AgentStep[];
}

/**
 * Context for agent workflow
 */
export interface AgentWorkflowContext {
  objective: string;              // 達成目標
  inputs?: any;                   // 入力データ
  state?: {                       // 前ステップからの申し送り事項
    content: string;
    usage?: number;
  };
  plan?: AgentPlan;               // 実行計画
  executionLog?: AgentExecutionLog[];  // 実行履歴
  currentStep?: AgentStep;        // 現在実行中のステップ
  actionResult?: any;             // 現在のアクション結果
  phase?: 'planning' | 'execution' | 'integration' | 'complete';
}

/**
 * Options for agent workflow
 */
export interface AgentWorkflowOptions {
  maxSteps?: number;              // 最大ステップ数（デフォルト: 5）
  actions?: Record<string, ActionHandler>;  // 利用可能なアクション
  enablePlanning?: boolean;       // 計画フェーズの有効化（デフォルト: true）
}
