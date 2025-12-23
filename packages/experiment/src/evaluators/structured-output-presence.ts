/**
 * Structured Output Presence Evaluator
 *
 * Checks if structuredOutput exists and is a valid object
 */

import type { CodeEvaluator, EvaluationContext, EvaluationResult } from '../types.js';

export default {
  name: 'Structured Output Presence',
  description: 'Checks if structuredOutput exists and is a valid object',

  async evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    const errors: string[] = [];
    let validCount = 0;
    const runDetails: Array<{ run: number; valid: boolean; error?: string }> = [];

    for (let i = 0; i < context.runs.length; i++) {
      const run = context.runs[i];
      const { structuredOutput } = run.queryResult;

      if (!structuredOutput) {
        errors.push(`Run ${i + 1}: No structured output`);
        runDetails.push({ run: i + 1, valid: false, error: 'No structured output' });
        continue;
      }

      // Basic JSON validation
      if (typeof structuredOutput === 'object' && structuredOutput !== null) {
        validCount++;
        runDetails.push({ run: i + 1, valid: true });
      } else {
        const error = 'Invalid JSON structure';
        errors.push(`Run ${i + 1}: ${error}`);
        runDetails.push({ run: i + 1, valid: false, error });
      }
    }

    const score = context.runs.length > 0
      ? (validCount / context.runs.length) * 10
      : 0;

    return {
      evaluator: 'structured-output-presence',
      moduleName: context.moduleName,
      score,
      reasoning: errors.length > 0
        ? `${validCount}/${context.runs.length} valid outputs. Issues: ${errors.join('; ')}`
        : `All ${validCount} outputs have valid JSON structure`,
      details: {
        validCount,
        totalCount: context.runs.length,
        errors,
        runs: runDetails,
      },
    };
  },
} satisfies CodeEvaluator;
