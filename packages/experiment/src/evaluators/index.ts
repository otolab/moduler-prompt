/**
 * Built-in evaluators
 */

import structuredOutputPresence from './structured-output-presence.js';
import llmRequirementFulfillment from './llm-requirement-fulfillment.js';
import type { CodeEvaluator, PromptEvaluator } from '../types.js';

type BuiltinEvaluator = CodeEvaluator | PromptEvaluator;

export const builtinEvaluators: Record<string, BuiltinEvaluator> = {
  'structured-output-presence': structuredOutputPresence,
  'llm-requirement-fulfillment': llmRequirementFulfillment,
};

/**
 * Get builtin evaluator by name
 */
export function getBuiltinEvaluator(name: string): BuiltinEvaluator | undefined {
  return builtinEvaluators[name];
}
