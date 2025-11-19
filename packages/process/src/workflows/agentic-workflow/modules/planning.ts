import type { PromptModule } from '@moduler-prompt/core';
import type { AgenticWorkflowContext } from '../types.js';

/**
 * Planning phase module for agent workflow
 * Phase-specific definitions for generating execution plan
 *
 * Should be merged with agentic and user's module:
 *   merge(agentic, planning, userModule)
 */
export const planning: PromptModule<AgenticWorkflowContext> = {
  methodology: [
    '- **Current Phase: Planning**',
    '  - Generate an execution plan by breaking down the Objective and Instructions into 3-5 executable steps.',
    '  - Output structured JSON text immediately, with no explanations or commentary.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planning Requirements',
      items: [
        '- Break down the **Objective and Instructions shown above** into 3-5 concrete executable steps',
        '- Each step must have: id, description, guidelines (2-4 items), constraints (1-3 items)',
        '  - **guidelines**: Specific actions or principles to follow in this step',
        '  - **constraints**: Specific limitations or prohibitions for this step',
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
    'Output format: {"steps": [...]}'
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
                description: {
                  type: 'string',
                  description: 'Brief summary of what this step accomplishes'
                },
                guidelines: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific actions or principles to follow in this step (2-4 items)'
                },
                constraints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific limitations or prohibitions for this step (1-3 items)'
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
              required: ['id', 'description', 'guidelines', 'constraints']
            },
            description: 'List of execution plan steps'
          }
        },
        required: ['steps']
      }
    }
  ]
};
