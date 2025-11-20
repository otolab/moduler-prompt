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
    '  - **For each step, generate a complete prompt** consisting of:',
    '    - `instructions`: Array of instruction strings that will guide the AI in executing this step',
    '    - `data`: Array of data strings that provide context, materials, or state information for this step',
    '  - Output structured JSON text immediately, with no explanations or commentary.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planning Requirements',
      items: [
        '- Break down the **Objective and Instructions shown above** into 3-5 concrete executable steps',
        '- Each step must have: id, prompt.instructions[], prompt.data[]',
        '  - **prompt.instructions**: Complete instruction array for this step (as if writing a prompt for AI)',
        '    - Include specific actions, principles, and constraints',
        '    - Write clear, actionable instructions that can be executed independently',
        '    - Typically 3-7 instruction items per step',
        '  - **prompt.data**: Data array providing context for this step',
        '    - Include relevant input data, materials, or state information',
        '    - Can be empty if step requires no additional data',
        '    - Typically 0-3 data items per step',
        '- The steps should accomplish the Instructions in a logical sequence',
        '- Consider available tools when defining actions (currently none available)',
        '- Ensure logical flow between steps',
        '',
        '**CRITICAL: Output Format**',
        '- Respond ONLY with valid JSON text',
        '- NO explanatory text before or after the JSON',
        '- NO markdown code blocks (```json)',
        '- Start directly with { and end with }'
      ]
    }
  ],

  inputs: [
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
  ],

  state: [
    'Phase: planning'
  ],

  cue: [
    'Respond with a JSON-formatted string containing the execution plan.',
    'Output format: {"steps": [{"id": "...", "prompt": {"instructions": [...], "data": [...]}}]}'
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
                  type: 'object',
                  properties: {
                    instructions: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Complete instruction array for this step (3-7 items typically)'
                    },
                    data: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Data array providing context for this step (0-3 items typically)'
                    }
                  },
                  required: ['instructions', 'data'],
                  description: 'Complete prompt for executing this step'
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
            description: 'List of execution plan steps with complete prompts'
          }
        },
        required: ['steps']
      }
    }
  ]
};
