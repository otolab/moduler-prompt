import type { PromptModule } from '@moduler-prompt/core';
import type { AgenticWorkflowContext } from '../types.js';

/**
 * Agentic module - Common definitions for agent workflow
 * Defines the basic behavior and terminology for agentic processing
 *
 * This module should be merged with user's module:
 *   agentProcess(driver, merge(agenticModule, userModule), context)
 */
export const agentic: PromptModule<AgenticWorkflowContext> = {
  terms: [
    '- instructions: Specific directives to achieve the Objective. Step execution procedures are provided separately in the methodology.'
  ],

  methodology: [
    {
      type: 'subsection',
      title: 'Fundamentals of Agent Processing',
      items: [
        'Multi-step processing that executes complex tasks in stages',
        'Results from each step are passed to the next step',
        'Integrate results from all steps to generate final output'
      ]
    }
  ]
};
