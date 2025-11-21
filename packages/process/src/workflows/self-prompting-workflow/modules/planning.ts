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
  terms: [
    '- **Processing Step**: A unit of work to accomplish the objective (NOT a part of the deliverable)',
    '- **Self-contained Prompt**: Complete instruction text for executing one step independently',
    '  - Template structure:',
    '    ```',
    '    # Instructions',
    '    [What to do, requirements]',
    '    ',
    '    # Data',
    '    [All necessary data]',
    '    ```'
  ],

  methodology: [
    '- **Current Phase: Planning**',
    '  - Generate an execution plan by breaking down the Objective and Instructions into 3-5 **processing steps**',
    '  - For each processing step, generate a self-contained prompt',
    '  - Output structured JSON text immediately, with no explanations or commentary'
  ],

  instructions: [
    {
      type: 'subsection',
      title: 'Planning Requirements',
      items: [
        '- Break down the Objective and Instructions into 3-5 processing steps',
        '- Each step must have: id, prompt',
        '  - **id**: Unique identifier (step-1, step-2, ...)',
        '  - **prompt**: Self-contained text following template:',
        '    ```',
        '    # Instructions',
        '    [What to do]',
        '    ',
        '    # Data',
        '    [All necessary data from Input Data section]',
        '    ```',
        '  - Include all data needed to execute the step',
        '  - For steps depending on previous steps: mention "Results from step-X will be provided"',
        '',
        '**Output Format**',
        '- Respond ONLY with valid JSON',
        '- NO explanatory text',
        '- NO markdown code blocks',
        '- Start with { "steps": [ and end with ]}'
      ]
    }
  ],

  inputs: [
    (ctx) => ctx.inputs ? JSON.stringify(ctx.inputs, null, 2) : null
  ],

  cue: [
    'Respond with JSON execution plan: {"steps": [{"id": "step-1", "prompt": "..."}, ...]}'
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
                  description: 'Self-contained prompt text following template: "# Instructions\\n[command]\\n[requirements]\\n\\n# Data\\n[all necessary data]"'
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
            description: 'List of processing steps to accomplish the objective'
          }
        },
        required: ['steps']
      }
    }
  ]
};
