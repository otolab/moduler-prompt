import { merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import type { AgentWorkflowContext } from '../types.js';
import { common } from './common.js';

/**
 * Planning phase module for agent workflow
 * Phase-specific definitions for generating execution plan
 *
 * Should be merged with user's module:
 *   merge(planning, userModule)
 */
const planningBase: PromptModule<AgentWorkflowContext> = {
  methodology: [
    '',
    'Currently in Planning phase. Analyze the Objective and Instructions to generate an execution plan broken down into executable steps.'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planning Phase Process',
      items: [
        '- Analyze the objective and instructions to break them down into executable steps',
        '- Each step should include:',
        '  - id: Unique identifier',
        '  - description: Brief summary of the step',
        '  - dos: List of things to do (2-4 specific actions)',
        '  - donts: List of things NOT to do (1-3 specific prohibitions)',
        '  - actions: External tools to use (optional, only if tools are available)',
        '- Aim for approximately 3-5 steps'
      ]
    },
    {
      type: 'subsection',
      title: 'Available Tools',
      items: [
        '- No tools are available'
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
    'Output a JSON object containing the actual array of steps following the JSON Output Format below.',
    'Generate actual data (an object with a steps property), not the JSON Schema definition itself.'
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
                dos: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of specific things to do in this step (2-4 items)'
                },
                donts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of specific things NOT to do in this step (1-3 items)'
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
              required: ['id', 'description', 'dos', 'donts']
            },
            description: 'List of execution plan steps'
          }
        },
        required: ['steps']
      }
    }
  ]
};

export const planning = merge(common, planningBase);
