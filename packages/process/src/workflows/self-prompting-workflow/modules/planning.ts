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
        '- **CRITICAL**: Each step prompt must be completely self-contained and executable independently',
        '  - Do NOT assume the executor knows about other steps or the overall plan',
        '  - Do NOT use relative references like "step-1の結果" or "前のステップ" or "2ヶ月目"',
        '  - Each step must include full context needed to understand and execute it',
        '- Each step must have: id, prompt',
        '  - **id**: Unique step identifier (e.g., "step-1", "step-2")',
        '  - **prompt**: Complete prompt text for this step as a single string',
        '    - Include the specific objective/goal of THIS step',
        '    - Include all necessary context (overall objective, constraints, reference materials)',
        '    - Include clear, actionable instructions',
        '    - Use natural language - write as if giving instructions to a human',
        '    - The prompt should be self-contained and executable without any other information',
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

  cue: [
    'Respond with a JSON-formatted string containing the execution plan.',
    'Output format: {"steps": [{"id": "step-1", "prompt": "Complete prompt text for this step..."}]}'
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
