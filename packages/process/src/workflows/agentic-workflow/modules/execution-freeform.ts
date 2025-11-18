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
    '',
    '**Current Phase: Execution**',
    '',
    '- Execute only the current step of the execution plan.',
    '- Follow the dos/donts specified in the plan.',
    '- Output the reasoning process and results as natural text.'
  ],

  // Replace user's instructions with plan-based dos/donts
  // Note: User's original instructions are omitted in agentic-workflow.ts
  instructions: [
    (ctx: AgenticWorkflowContext) => {
      const items: string[] = [
        '- Focus on the current step instructions only',
        '- Perform sufficient processing for this step',
        '- Concise output is acceptable if appropriate for the step',
        '- Do NOT execute instructions from other steps'
      ];

      // Add previous step result usage instruction if available
      if (ctx.executionLog && ctx.executionLog.length > 0) {
        items.push('');
        items.push('**CRITICAL: Use Previous Step Results**');
        items.push('- Previous step results are shown in the "Data" section below');
        items.push('- You MUST reference and use the decisions/outputs from previous steps');
        items.push('- Do NOT redo or repeat what previous steps have already accomplished');
        items.push('- Your current step should continue from where the previous step left off');
      }

      return items;
    },
    {
      type: 'subsection',
      title: 'Current Step Instructions',
      items: [
        (ctx: AgenticWorkflowContext) => {
          if (!ctx.currentStep) {
            return null;
          }

          const items: string[] = [];

          // Add dos
          if (ctx.currentStep.dos && ctx.currentStep.dos.length > 0) {
            items.push('**Do:**');
            ctx.currentStep.dos.forEach((item: string) => items.push(`- ${item}`));
          }

          // Add donts
          if (ctx.currentStep.donts && ctx.currentStep.donts.length > 0) {
            items.push('');
            items.push('**Don\'t:**');
            ctx.currentStep.donts.forEach((item: string) => items.push(`- ${item}`));
          }

          return items.length > 0 ? items : null;
        }
      ]
    } as const,
    {
      type: 'subsection',
      title: 'Available Tools',
      items: [
        '- No tools are available'
      ]
    } as const
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

      return ctx.executionLog.map((log) => {
        const parts: string[] = [];

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
  ],

  cue: [
    '- Execute the current step following the dos/donts.',
    '- Explain your reasoning and what you accomplished.',
    '- Output your response as natural text (not JSON).'
  ]
};
