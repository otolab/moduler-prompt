/**
 * Evaluator runner
 *
 * Runs evaluation (code or prompt-based) for a single module
 */

import { compile } from '@moduler-prompt/core';
import { formatCompletionPrompt } from '@moduler-prompt/driver';
import type { AIService } from '@moduler-prompt/driver';
import type { EvaluationContext, EvaluationResult } from '../types.js';
import type { LoadedEvaluator } from '../config/dynamic-loader.js';

export class EvaluatorRunner {
  constructor(
    private aiService: AIService,
    private evaluatorModel: any
  ) {}

  /**
   * Run evaluation for a single module
   *
   * @param evaluator - Loaded evaluator
   * @param context - Evaluation context
   * @returns Evaluation result
   */
  async evaluate(
    evaluator: LoadedEvaluator,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    console.log(`🔍 [${evaluator.name}] Evaluating ${context.moduleName}...`);

    try {
      if (evaluator.type === 'code') {
        // Code evaluator - direct execution
        return await evaluator.codeEvaluator!.evaluate(context);
      } else {
        // Prompt evaluator - LLM execution
        return await this.evaluateWithPrompt(evaluator, context);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`🔍 [${evaluator.name}] ❌ Error: ${errorMessage}`);

      return {
        evaluator: evaluator.name,
        moduleName: context.moduleName,
        error: errorMessage,
      };
    }
  }

  /**
   * Evaluate using prompt-based evaluator
   */
  private async evaluateWithPrompt(
    evaluator: LoadedEvaluator,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    // Compile evaluation prompt
    const compiled = compile(evaluator.promptEvaluator!.module, context);
    const prompt = formatCompletionPrompt(compiled);

    // Create driver for evaluator model
    const driver = await this.aiService.createDriver(this.evaluatorModel);

    // Run evaluation
    const startTime = Date.now();
    const result = await driver.query(compiled, {
      temperature: 0.3, // Lower temperature for consistent evaluation
      maxTokens: 4096,
    });
    const elapsed = Date.now() - startTime;

    console.log(`🔍 [${evaluator.name}] ✅ Completed (${elapsed}ms)`);

    // Close driver
    if (driver && typeof driver.close === 'function') {
      await driver.close();
    }

    // Use structured output if available
    if (result.structuredOutput) {
      const structured = result.structuredOutput as any;
      return {
        evaluator: evaluator.name,
        moduleName: context.moduleName,
        score: structured.score,
        reasoning: structured.reasoning,
        details: structured.details,
        raw: result.content,
      };
    }

    // Fallback: try to parse JSON from content
    try {
      const jsonMatch = result.content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          evaluator: evaluator.name,
          moduleName: context.moduleName,
          score: parsed.score,
          reasoning: parsed.reasoning,
          details: parsed.details,
          raw: result.content,
        };
      }
    } catch (parseError) {
      console.log(`🔍 [${evaluator.name}] ⚠️  Failed to parse JSON response`);
    }

    // Fallback: return raw response
    return {
      evaluator: evaluator.name,
      moduleName: context.moduleName,
      reasoning: result.content,
      raw: result.content,
    };
  }

  /**
   * Display evaluation results
   *
   * @param results - Evaluation results to display
   */
  displayResults(results: EvaluationResult[]): void {
    console.log();
    console.log('='.repeat(80));
    console.log('📊 Evaluation Results');
    console.log('='.repeat(80));
    console.log();

    // Group by module
    const byModule = new Map<string, EvaluationResult[]>();
    for (const result of results) {
      if (!byModule.has(result.moduleName)) {
        byModule.set(result.moduleName, []);
      }
      byModule.get(result.moduleName)!.push(result);
    }

    for (const [moduleName, moduleResults] of byModule) {
      console.log(`📦 ${moduleName}`);
      console.log('─'.repeat(80));

      for (const result of moduleResults) {
        console.log(`   🔍 ${result.evaluator}`);

        if (result.error) {
          console.log(`      ❌ Error: ${result.error}`);
        } else {
          if (result.score !== undefined) {
            console.log(`      Score: ${result.score.toFixed(1)}/10`);
          }
          if (result.reasoning) {
            console.log(`      Reasoning: ${result.reasoning}`);
          }
          if (result.details) {
            console.log(`      Details:`);
            console.log(`      ${JSON.stringify(result.details, null, 2).split('\n').join('\n      ')}`);
          }
        }
        console.log();
      }
    }

    console.log('='.repeat(80));
  }
}
