/**
 * Action handler type for agentic workflow
 */
export type ActionHandler<TContext = any> = (
  params: any,
  context: TContext
) => Promise<any>;

/**
 * Agentic workflow step definition
 */
export interface AgenticStep {
  id: string;
  description: string;
  guidelines?: string[];  // Actions or principles to follow in this step
  constraints?: string[]; // Limitations or prohibitions for this step
  actions?: Array<{      // External tools to use (supports multiple tools)
    tool: string;
    params?: any;
  }>;
}

/**
 * Agentic workflow execution log entry
 */
export interface AgenticExecutionLog {
  stepId: string;
  reasoning: string;    // Thought process and analysis
  result: string;       // Execution result
  actionResult?: any;
  metadata?: any;
}

/**
 * Agentic workflow plan (structured output from planning phase)
 */
export interface AgenticPlan {
  steps: AgenticStep[];
}

/**
 * Context for agentic workflow
 */
export interface AgenticWorkflowContext {
  objective: string;              // 達成目標
  inputs?: any;                   // 入力データ
  state?: {                       // 前ステップからの申し送り事項
    content: string;
    usage?: number;
  };
  plan?: AgenticPlan;               // 実行計画
  executionLog?: AgenticExecutionLog[];  // 実行履歴
  currentStep?: AgenticStep;        // 現在実行中のステップ
  actionResult?: any;             // 現在のアクション結果
  phase?: 'planning' | 'execution' | 'integration' | 'complete';
}

/**
 * Options for agentic workflow
 */
export interface AgenticWorkflowOptions {
  maxSteps?: number;              // 最大ステップ数（デフォルト: 5）
  actions?: Record<string, ActionHandler>;  // 利用可能なアクション
  enablePlanning?: boolean;       // 計画フェーズの有効化（デフォルト: true）
  useFreeformExecution?: boolean; // Use freeform execution module (デフォルト: false)
  logger?: any;                   // Logger instance for debug output
}
