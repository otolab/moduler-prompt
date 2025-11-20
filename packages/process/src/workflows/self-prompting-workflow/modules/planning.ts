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
    '- **Processing Step**: A unit of work that will be executed to accomplish the objective',
    '  - NOT a part or section of the final deliverable',
    '  - Example for "create a 3-month plan": Processing steps are "Research resources", "Draft weekly schedules", "Define evaluations"',
    '  - NOT "Month 1", "Month 2", "Month 3" - these are parts of the deliverable',
    '- **Self-contained Prompt**: Instruction text for executing one processing step',
    '  - Includes: what to create, what data to use, requirements to follow',
    '  - Example: "Research beginner-friendly web development resources. Focus on HTML, CSS, JavaScript. List at least 5 free online courses with brief descriptions."'
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
        '- Break down the **Objective and Instructions shown above** into 3-5 **processing steps**',
        '- Each processing step must have: id, prompt',
        '  - **id**: Unique identifier (e.g., "step-1", "step-2")',
        '  - **prompt**: Self-contained instruction text for this processing step',
        '    - Write as a command: "Research...", "Create...", "Analyze..."',
        '    - Include what to create or do',
        '    - Include what information or data to use',
        '    - Include any specific requirements',
        '- The processing steps should accomplish the work in a logical sequence',
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
                  description: 'Instruction text for AI: what to create, what data to use, requirements'
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
