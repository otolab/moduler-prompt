import type { PromptModule } from '@moduler-prompt/core';
import type { SelfPromptingWorkflowContext } from '../types.js';

/**
 * Planning phase module for self-prompting workflow
 * Phase-specific definitions for generating execution plan with complete prompts
 *
 * Should be merged with base module and user's module:
 *   merge(baseModule, planning, userModule)
 */
export const planning: PromptModule<SelfPromptingWorkflowContext> = {
  methodology: [
    '- **Current Phase: Planning**',
    '  - Generate an execution plan by breaking down the Objective and Instructions into 3-5 executable steps.',
    '  - **For each step, generate a complete prompt string** that will be executed directly.',
    '  - Each prompt must be self-contained with full context, instructions, and necessary data.',
    '  - Output structured JSON text immediately, with no explanations or commentary.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planning Requirements',
      items: [
        '- Break down the **Objective and Instructions shown above** into 3-5 concrete executable steps',
        '- Each step must have: id, prompt',
        '  - **id**: Unique step identifier (e.g., "step-1", "step-2")',
        '  - **prompt**: Complete self-contained prompt text for this step',
        '- The prompt must include all necessary context and instructions to execute the step independently',
        '- The steps should accomplish the Instructions in a logical sequence',
        '- Consider available tools when defining actions (currently none available)',
        '',
        '**CRITICAL: Output Format**',
        '- Respond ONLY with valid JSON text',
        '- NO explanatory text before or after the JSON',
        '- NO markdown code blocks (```json)',
        '- Start directly with { "steps": [ and end with ]}'
      ]
    }
  ],

  inputs: [
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
  ],

  cue: [
    'Respond with a JSON-formatted execution plan.',
    'Format: {"steps": [{"id": "step-1", "prompt": "..."}, {"id": "step-2", "prompt": "..."}, ...]}'
  ],

  schema: [
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique step ID (e.g., step-1, step-2)'
                },
                prompt: {
                  type: 'string',
                  description: 'Complete prompt text for executing this step independently'
                },
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tool: {
                        type: 'string',
                        description: 'Tool name from available actions'
                      },
                      params: {
                        type: 'object',
                        description: 'Tool parameters (optional)'
                      }
                    },
                    required: ['tool']
                  },
                  description: 'External tools to use (optional, only if available actions exist)'
                }
              },
              required: ['id', 'prompt']
            },
            description: 'List of execution plan steps, each with a complete self-contained prompt'
          }
        },
        required: ['steps']
      }
    }
  ]
};
