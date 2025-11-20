import type { PromptModule } from '@moduler-prompt/core';
import type { SelfPromptingWorkflowContext, SelfPromptingStep } from '../types.js';

/**
 * Execution phase module for self-prompting workflow
 * Phase-specific definitions for executing a single step using generated prompts
 *
 * Should be merged with base module and user's module:
 *   merge(baseModule, execution, userModule)
 */
export const execution: PromptModule<SelfPromptingWorkflowContext> = {
  methodology: [
    '',
    '**Current Phase: Execution**',
    '',
    '- Execute only the current step using the pre-generated prompt.',
    '- The prompt.instructions and prompt.data arrays below are the complete instructions for this step.',
    '- Output the reasoning process and results as structured JSON text.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Current Step Instructions',
      items: [
        (ctx) => {
          if (!ctx.currentStep || !ctx.currentStep.prompt) {
            return null;
          }

          // Return the pre-generated instructions directly
          return ctx.currentStep.prompt.instructions;
        }
      ]
    },
    {
      type: 'subsection',
      title: 'Available Tools',
      items: [
        '- No tools are available'
      ]
    },
    {
      type: 'subsection',
      title: 'Execution Plan Overview',
      items: [
        (ctx) => {
          if (!ctx.plan) {
            return null;
          }

          const currentStepId = ctx.currentStep?.id;

          return ctx.plan.steps.map((step: SelfPromptingStep) => {
            const parts: string[] = [];

            // Step ID
            parts.push(step.id);

            // Tools
            if (step.actions && step.actions.length > 0) {
              const toolNames = step.actions.map(a => a.tool).join(', ');
              parts.push(`(Tools: ${toolNames})`);
            }

            const baseText = parts.join(' ');

            // Mark current step
            if (step.id === currentStepId) {
              return `- **${baseText}** ← **[Currently executing]**`;
            }

            return `- ${baseText}`;
          });
        }
      ]
    }
  ],

  state: [
    (ctx) => {
      const completed = ctx.executionLog?.length || 0;
      const total = ctx.plan?.steps.length || 0;
      return `Progress: ${completed}/${total} steps completed`;
    },
    (ctx) => {
      if (ctx.state) {
        return `Handover from previous step: ${ctx.state.content}`;
      }
      return null;
    }
  ],

  inputs: [
    (ctx) => {
      // If current step has pre-generated data, use it
      if (ctx.currentStep?.prompt?.data && ctx.currentStep.prompt.data.length > 0) {
        return ctx.currentStep.prompt.data.join('\n\n');
      }

      // Otherwise, fall back to context inputs
      return ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null;
    }
  ],

  materials: [
    (ctx) => {
      if (ctx.actionResult === undefined) {
        return null;
      }

      return {
        type: 'material' as const,
        id: 'action-result',
        title: 'Action execution result for current step',
        content: typeof ctx.actionResult === 'string'
          ? ctx.actionResult
          : JSON.stringify(ctx.actionResult, null, 2)
      };
    },
    (ctx) => {
      if (!ctx.executionLog || ctx.executionLog.length === 0 || !ctx.plan) {
        return null;
      }

      return ctx.executionLog.map((log) => {
        // Find the corresponding step to get original prompt
        const step = ctx.plan!.steps.find((s: SelfPromptingStep) => s.id === log.stepId);

        const contentParts: string[] = [];

        // Instructions section (from generated prompt)
        if (step && step.prompt) {
          contentParts.push('## Instructions');
          contentParts.push('');
          step.prompt.instructions.forEach(item => contentParts.push(`- ${item}`));
          contentParts.push('');

          if (step.prompt.data && step.prompt.data.length > 0) {
            contentParts.push('## Data');
            contentParts.push('');
            contentParts.push(step.prompt.data.join('\n\n'));
            contentParts.push('');
          }
        }

        // Result section
        contentParts.push('## Result');
        contentParts.push('');
        contentParts.push(log.result);

        if (log.actionResult !== undefined) {
          const actionResultStr = typeof log.actionResult === 'string'
            ? log.actionResult
            : JSON.stringify(log.actionResult, null, 2);
          contentParts.push('');
          contentParts.push('**Action Result:**');
          contentParts.push(actionResultStr);
        }

        return {
          type: 'material' as const,
          id: `previous-step-${log.stepId}`,
          title: `Previous step result: ${log.stepId}`,
          content: contentParts.join('\n')
        };
      });
    }
  ],

  cue: [
    'Output a JSON object containing the execution result of the current step following the JSON Output Format below.',
    'Generate actual data (an object with result and nextState properties), not the JSON Schema definition itself.'
  ],

  schema: [
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          result: {
            type: 'string',
            description: 'Execution result: Describe what was done in this step and what results were obtained.'
          },
          nextState: {
            type: 'string',
            description: 'Handover note for the next step (simple text, not object/array)'
          }
        },
        required: ['result', 'nextState']
      }
    }
  ]
};
