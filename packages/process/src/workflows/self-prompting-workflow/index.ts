/**
 * Self-prompting workflow - AI generates complete prompts for each execution step
 *
 * This workflow is an alternative to agentic-workflow where the AI generates
 * complete prompts (instructions + data arrays) during planning, and executes
 * them directly without moduler-prompt compilation during execution phase.
 */

export { selfPromptingProcess } from './self-prompting-workflow.js';
export { planning } from './modules/planning.js';
export { execution } from './modules/execution.js';
export { integration } from './modules/integration.js';
export type {
  SelfPromptingWorkflowContext,
  SelfPromptingWorkflowOptions,
  SelfPromptingPlan,
  SelfPromptingStep,
  SelfPromptingExecutionLog,
  ActionHandler
} from './types.js';
