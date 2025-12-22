import type { PromptModule } from '@modular-prompt/core';
import type { SelfPromptingWorkflowContext, SelfPromptingStep } from '../types.js';

/**
 * Integration phase module for self-prompting workflow
 * Phase-specific definitions for integrating all step results
 *
 * Should be merged with base module and user's module:
 *   merge(baseModule, integration, userModule)
 */
export const integration: PromptModule<SelfPromptingWorkflowContext> = {
  methodology: [
    '- **Current Phase: Integration**',
    '  - Integrate results from all executed steps.',
    '  - Generate the final output that achieves the overall objective.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Integration Phase Process',
      items: [
        '- Integrate execution results from all steps in the "Execution Plan" to generate the final output',
        '- Verify that the objective has been achieved',
        '- Clearly describe important results from each step'
      ]
    },
    {
      type: 'subsection',
      title: 'Execution Plan (All Steps Completed)',
      items: [
        (ctx) => {
          if (!ctx.plan) {
            return null;
          }

          return ctx.plan.steps.map((step: SelfPromptingStep) => {
            const parts: string[] = [step.id];

            // Tools
            if (step.actions && step.actions.length > 0) {
              const toolNames = step.actions.map(a => a.tool).join(', ');
              parts.push(`(Tools: ${toolNames})`);
            }

            return `- ${parts.join(' ')}`;
          });
        }
      ]
    }
  ],

  state: [
    (ctx) => {
      const total = ctx.plan?.steps.length || 0;
      return `All ${total} steps completed. Generating final output.`;
    }
  ],

  inputs: [
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
  ],

  materials: [
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      return ctx.executionLog.map((log) => {
        const parts: string[] = [];

        parts.push(`[Result]\n${log.result}`);

        if (log.actionResult !== undefined) {
          const actionResultStr = typeof log.actionResult === 'string'
            ? log.actionResult
            : JSON.stringify(log.actionResult, null, 2);
          parts.push(`[Action Result]\n${actionResultStr}`);
        }

        return {
          type: 'material' as const,
          id: `execution-result-${log.stepId}`,
          title: `Execution result: ${log.stepId}`,
          content: parts.join('\n\n')
        };
      });
    }
  ],

  cue: [
    'Integrate all execution results to generate the final output.',
    'Summarize what was accomplished and provide the complete solution to the objective.'
  ]
};
