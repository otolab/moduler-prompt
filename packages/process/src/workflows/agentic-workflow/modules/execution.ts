import { merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import type { AgenticWorkflowContext, AgenticStep } from '../types.js';
import { common } from './common.js';

/**
 * Execution phase module for agent workflow
 * Phase-specific definitions for executing a single step
 *
 * Should be merged with user's module:
 *   merge(execution, userModule)
 */
const executionBase: PromptModule<AgenticWorkflowContext> = {
  methodology: [
    '',
    'Currently in Execution phase. Execute only the current step of the execution plan and record the results.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Execution Phase Process',
      items: [
        '- Focus solely on completing the current step',
        '- Utilize action results if available',
        '- Output result and nextState in a structured format'
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
      title: 'Execution Plan',
      items: [
        (ctx) => {
          if (!ctx.plan) {
            return null;
          }

          const currentStepId = ctx.currentStep?.id;

          return ctx.plan.steps.map((step: AgenticStep) => {
            const parts: string[] = [];

            // Description
            parts.push(step.description);

            // Tools
            if (step.actions && step.actions.length > 0) {
              const toolNames = step.actions.map(a => a.tool).join(', ');
              parts.push(`(Tools: ${toolNames})`);
            }

            const baseText = parts.join(' ');

            // For currently executing step, show dos/donts
            if (step.id === currentStepId) {
              const details: string[] = [`- **${baseText}** ← **[Currently executing]**`];

              if (step.dos && step.dos.length > 0) {
                details.push('  **Do:**');
                step.dos.forEach(item => details.push(`  - ${item}`));
              }

              if (step.donts && step.donts.length > 0) {
                details.push('  **Don\'t:**');
                step.donts.forEach(item => details.push(`  - ${item}`));
              }

              return details;
            }

            return `- ${baseText}`;
          }).flat();
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
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
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
      if (!ctx.executionLog || ctx.executionLog.length === 0) {
        return null;
      }

      // Show only the most recent execution result to reduce confusion
      const lastLog = ctx.executionLog[ctx.executionLog.length - 1];

      return {
        type: 'material' as const,
        id: `execution-result-${lastLog.stepId}`,
        title: `Previous step result: ${lastLog.stepId}`,
        content: lastLog.result
      };
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
            description: 'Execution result: Describe what was done in this step and what results were obtained. Include specific findings and outputs.'
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

export const execution = merge(common, executionBase);
