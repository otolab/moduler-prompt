import type { PromptModule } from '@moduler-prompt/core';
import type { AgenticWorkflowContext, AgenticStep } from '../types.js';

/**
 * Execution phase module (freeform version) for agent workflow
 *
 * This version differs from the standard execution module:
 * - Uses planned dos/donts as instructions (not fixed process steps)
 * - Outputs freeform text (not structured JSON)
 * - Accumulates all previous step results
 *
 * Should be merged with agentic and user's module:
 *   merge(agentic, executionFreeform, userModule)
 */
export const executionFreeform: PromptModule<AgenticWorkflowContext> = {
  methodology: [
    (ctx: AgenticWorkflowContext) => {
      const currentStepIndex = (ctx.executionLog?.length || 0) + 1;
      const totalSteps = ctx.plan?.steps.length || 0;
      return [
        `- **Current Phase: Execution (Step ${currentStepIndex}/${totalSteps})**`,
        '  - Execute only the current step of the execution plan.',
        '  - Follow the dos/don\'ts specified in the plan.',
        '  - Output the reasoning process and results as natural text.',
        ''
      ];
    }
  ],

  // Replace user's instructions with plan-based dos/donts
  // Note: User's original instructions are omitted in agentic-workflow.ts
  instructions: [
    (ctx: AgenticWorkflowContext) => {
      const items: string[] = [];

      // Add current step description first
      if (ctx.currentStep?.description) {
        items.push(ctx.currentStep.description);
        items.push('');
      }

      // Add general execution guidelines
      items.push('');
      items.push('**Requirements:**');
      if (ctx.executionLog && ctx.executionLog.length > 0) {
        items.push('- Build upon previous step results (shown in Data section below)');
        items.push('- Output only NEW content for THIS step - do NOT reproduce previous outputs');
      } else {
        items.push('- Focus on the current step instructions only');
      }
      items.push('- Concise output is acceptable');

      // Add dos
      if (ctx.currentStep?.dos && ctx.currentStep.dos.length > 0) {
        items.push('');
        items.push('**Do:**');
        ctx.currentStep.dos.forEach((item: string) => items.push(`- ${item}`));
      }

      // Add donts
      if (ctx.currentStep?.donts && ctx.currentStep.donts.length > 0) {
        items.push('');
        items.push('**Don\'t:**');
        ctx.currentStep.donts.forEach((item: string) => items.push(`- ${item}`));
      }

      return items;
    }
  ],

  state: [
    (ctx) => {
      const completed = ctx.executionLog?.length || 0;
      const total = ctx.plan?.steps.length || 0;
      return `Progress: ${completed}/${total} steps completed`;
    },
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

      return ctx.executionLog.map((log, index) => {
        const parts: string[] = [];

        // Add the step's instructions first
        const stepIndex = index;
        if (ctx.plan?.steps[stepIndex]) {
          const step = ctx.plan.steps[stepIndex];
          const instructionsParts: string[] = [];

          if (step.description) {
            instructionsParts.push(step.description);
          }

          if (step.dos && step.dos.length > 0) {
            instructionsParts.push('');
            instructionsParts.push('**Do:**');
            step.dos.forEach((item: string) => instructionsParts.push(`- ${item}`));
          }

          if (step.donts && step.donts.length > 0) {
            instructionsParts.push('');
            instructionsParts.push('**Don\'t:**');
            step.donts.forEach((item: string) => instructionsParts.push(`- ${item}`));
          }

          if (instructionsParts.length > 0) {
            parts.push(`[Instructions]\n${instructionsParts.join('\n')}`);
          }
        }

        if (log.reasoning) {
          parts.push(`[Reasoning]\n${log.reasoning}`);
        }

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
          title: `Previous step result: ${log.stepId}`,
          content: parts.join('\n\n')
        };
      });
    }
  ]
};
