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
    '- Objective: The ultimate goal to achieve',
    '- Instructions: Specific directives and requirements to accomplish the task',
    '- Execution Plan: Instructions broken down into executable steps',
    '- Action: Capability to perform external processing (API calls, data retrieval, etc.) during step execution'
  ],

  methodology: [
    'This workflow consists of three phases:',
    '1. Planning: Analyze the Objective and Instructions to generate an execution plan broken down into executable steps',
    '2. Execution: Execute each step in the execution plan sequentially and record results',
    '3. Integration: Integrate results from all steps to generate the final output'
  ]
};
