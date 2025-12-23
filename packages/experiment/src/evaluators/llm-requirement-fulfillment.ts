/**
 * LLM Requirement Fulfillment Evaluator
 *
 * Uses LLM to evaluate whether the output meets the functional requirements
 */

import type { PromptModule } from '@modular-prompt/core';
import type { PromptEvaluator, EvaluationContext } from '../types.js';

const llmRequirementFulfillmentModule: PromptModule<EvaluationContext> = {
  createContext: (): EvaluationContext => ({
    moduleName: '',
    prompt: '',
    runs: [],
  }),

  objective: [
    '- Assess whether the output correctly fulfills the given requirements',
  ],

  instructions: [
    '- Evaluate based on the following criteria:',
    {
      type: 'subsection',
      title: 'Evaluation Criteria',
      items: [
        '1. **Requirement Fulfillment**: Does it satisfy the intent described in the prompt?',
        '2. **Parameter Correctness**: Are all required parameters present and correct?',
        '3. **Parameter Completeness**: Are optional parameters appropriately used or omitted?',
        '4. **Logical Consistency**: Is the output logically consistent with the facts?',
      ],
    },
    {
      type: 'subsection',
      title: 'Scoring',
      items: [
        '- Assign scores (0-10) for each criterion',
        '- Calculate overall score based on all criteria',
        '- Provide clear reasoning for each score',
      ],
    },
  ],

  schema: [
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            description: 'Overall score (0-10)',
          },
          reasoning: {
            type: 'string',
            description: 'Summary of evaluation',
          },
          details: {
            type: 'object',
            properties: {
              requirementFulfillment: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  reasoning: { type: 'string' },
                },
              },
              parameterCorrectness: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  reasoning: { type: 'string' },
                },
              },
              parameterCompleteness: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  reasoning: { type: 'string' },
                },
              },
              logicalConsistency: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  reasoning: { type: 'string' },
                },
              },
            },
          },
        },
        required: ['score', 'reasoning', 'details'],
      },
    },
  ],
};

export default {
  name: 'LLM Requirement Fulfillment',
  description: 'Uses LLM to evaluate whether the output meets the functional requirements',
  module: llmRequirementFulfillmentModule,
} satisfies PromptEvaluator;
