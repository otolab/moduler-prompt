/**
 * Built-in evaluators
 */

import jsonValidator from './json-validator.js';
import functionalCorrectness from './functional-correctness.js';
import type { CodeEvaluator, PromptEvaluator } from '../types.js';

type BuiltinEvaluator = CodeEvaluator | PromptEvaluator;

export const builtinEvaluators: Record<string, BuiltinEvaluator> = {
  'json-validator': jsonValidator,
  'functional-correctness': functionalCorrectness,
};

/**
 * Get builtin evaluator by name
 */
export function getBuiltinEvaluator(name: string): BuiltinEvaluator | undefined {
  return builtinEvaluators[name];
}
