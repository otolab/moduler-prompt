/**
 * Action handler type for self-prompting workflow
 */
export type ActionHandler<TContext = any> = (
  params: any,
  context: TContext
) => Promise<any>;

/**
 * Self-prompting workflow step definition
 * Each step contains a complete prompt that will be executed directly
 */
export interface SelfPromptingStep {
  id: string;
  prompt: {
    instructions: string[];  // Instruction section content
    data: string[];          // Data section content
  };
  actions?: Array<{         // External tools to use (supports multiple tools)
    tool: string;
    params?: any;
  }>;
}

/**
 * Self-prompting workflow execution log entry
 */
export interface SelfPromptingExecutionLog {
  stepId: string;
  result: string;          // Execution result
  actionResult?: any;      // Action execution result
  metadata?: any;
}

/**
 * Self-prompting workflow plan (structured output from planning phase)
 */
export interface SelfPromptingPlan {
  steps: SelfPromptingStep[];
}

/**
 * Context for self-prompting workflow
 */
export interface SelfPromptingWorkflowContext {
  inputs?: any;                                 // Input data
  state?: {                                     // State from previous step
    content: string;
    usage?: number;
  };
  plan?: SelfPromptingPlan;                     // Execution plan
  executionLog?: SelfPromptingExecutionLog[];   // Execution history
  currentStep?: SelfPromptingStep;              // Currently executing step
  actionResult?: any;                           // Current action result
  phase?: 'planning' | 'execution' | 'integration' | 'complete';
}

/**
 * Options for self-prompting workflow
 */
export interface SelfPromptingWorkflowOptions {
  maxSteps?: number;                          // Maximum number of steps (default: 5)
  actions?: Record<string, ActionHandler>;    // Available actions
  enablePlanning?: boolean;                   // Enable planning phase (default: true)
  logger?: any;                               // Logger instance for debug output
}
