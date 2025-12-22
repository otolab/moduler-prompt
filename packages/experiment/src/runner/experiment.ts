/**
 * Experiment runner - orchestrates the entire experiment
 */

import { formatCompletionPrompt } from '@moduler-prompt/driver';
import type { AIService, QueryResult } from '@moduler-prompt/driver';
import type { ModuleDefinition, TestResult, EvaluationContext, EvaluationResult } from '../types.js';
import type { DriverManager } from './driver-manager.js';
import type { LoadedEvaluator } from '../config/dynamic-loader.js';
import { EvaluatorRunner } from './evaluator.js';

export class ExperimentRunner {
  constructor(
    private aiService: AIService,
    private driverManager: DriverManager,
    private modules: ModuleDefinition[],
    private testCases: any[],
    private models: any[],
    private repeatCount: number,
    private evaluators?: LoadedEvaluator[],
    private evaluatorModel?: any
  ) {}

  /**
   * Run the experiment
   *
   * @returns Array of TestResult
   */
  async run(): Promise<TestResult[]> {
    const allResults: TestResult[] = [];
    const evaluationContexts: EvaluationContext[] = [];

    for (const testCase of this.testCases) {
      console.log('─'.repeat(80));
      console.log(`Test Case: ${testCase.name}`);
      console.log(`Description: ${testCase.description}`);
      console.log('─'.repeat(80));
      console.log();

      // Prepare context
      const context = {
        analysisResult: testCase.analysisResult,
        relevantContext: testCase.relevantContext,
        toolDefinition: testCase.toolDefinition,
      };

      // Compile all modules
      const compiledModules = this.modules.map(module => {
        console.log(`📝 [${module.name}] Compiling prompt...`);
        const compiled = module.compile(context);
        const prompt = formatCompletionPrompt(compiled);
        console.log(`   Prompt length: ${prompt.length} chars`);
        console.log();

        return {
          name: module.name,
          compiled,
          prompt,
        };
      });

      // Compare prompts if multiple modules
      if (compiledModules.length > 1) {
        this.comparePrompts(compiledModules);
      }

      // Test with each model
      for (const modelSpec of this.models) {
        console.log(`🤖 Testing with ${modelSpec.model} (${modelSpec.provider})`);

        // Select driver for this model
        const selectedModels = this.aiService.selectModels(['tools']);
        const targetModel = selectedModels.find(m => m.provider === modelSpec.provider);

        if (!targetModel) {
          console.log(`   ⚠️  Skipping: model not selected by AIService`);
          console.log();
          continue;
        }

        // Get or create driver
        const driver = await this.driverManager.getOrCreate(this.aiService, targetModel);

        // Test each module
        for (const { name, compiled, prompt } of compiledModules) {
          const runs = await this.runModuleTest(name, compiled, driver);

          allResults.push({
            testCase: testCase.name,
            model: `${modelSpec.provider}:${modelSpec.model}`,
            module: name,
            runs: runs.map(r => ({
              success: r.success,
              elapsed: r.elapsed,
              content: r.queryResult?.content || '',
              error: r.error,
            })),
          });

          // Collect for evaluation (if all runs succeeded)
          const successfulRuns = runs.filter(r => r.success);
          if (successfulRuns.length > 0) {
            evaluationContexts.push({
              moduleName: name,
              prompt,
              runs: successfulRuns.map(r => ({ queryResult: r.queryResult! })),
            });
          }
        }
      }
    }

    // Run evaluation phase if evaluators are provided
    if (this.evaluators && this.evaluators.length > 0 && this.evaluatorModel) {
      await this.runEvaluationPhase(evaluationContexts);
    }

    return allResults;
  }

  /**
   * Run module test with multiple repetitions
   */
  private async runModuleTest(
    moduleName: string,
    compiled: any,
    driver: any
  ): Promise<Array<{ success: boolean; elapsed: number; queryResult?: QueryResult; error?: string }>> {
    console.log(`   [${moduleName}] Running ${this.repeatCount} time(s)...`);

    const runs: Array<{ success: boolean; elapsed: number; queryResult?: QueryResult; error?: string }> = [];

    for (let i = 0; i < this.repeatCount; i++) {
      console.log(`   [${moduleName}] Run ${i + 1}/${this.repeatCount}...`);

      const startTime = Date.now();
      try {
        const result = await driver.query(compiled, {
          temperature: 0.7,
          maxTokens: 2048,
        });
        const elapsed = Date.now() - startTime;

        console.log(`   [${moduleName}] ✅ Success (${elapsed}ms)`);
        runs.push({
          success: true,
          elapsed,
          queryResult: result,
        });
      } catch (error) {
        const elapsed = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   [${moduleName}] ❌ Error (${elapsed}ms): ${errorMessage}`);
        runs.push({
          success: false,
          elapsed,
          error: errorMessage,
        });
      }
    }

    console.log();
    return runs;
  }

  /**
   * Run evaluation phase
   */
  private async runEvaluationPhase(
    evaluationContexts: EvaluationContext[]
  ): Promise<void> {
    console.log();
    console.log('='.repeat(80));
    console.log('🔍 Evaluation Phase');
    console.log('='.repeat(80));
    console.log();

    const evaluatorRunner = new EvaluatorRunner(this.aiService, this.evaluatorModel);
    const allEvaluations: EvaluationResult[] = [];

    // Evaluate each module with each evaluator
    for (const context of evaluationContexts) {
      console.log(`📦 Evaluating: ${context.moduleName}`);
      console.log();

      for (const evaluator of this.evaluators!) {
        const result = await evaluatorRunner.evaluate(evaluator, context);
        allEvaluations.push(result);
      }
    }

    // Display all evaluation results
    evaluatorRunner.displayResults(allEvaluations);
  }

  /**
   * Compare prompts across modules
   */
  private comparePrompts(compiledModules: Array<{ name: string; prompt: string }>): void {
    console.log('📊 Prompt Comparison:');

    for (let i = 0; i < compiledModules.length; i++) {
      const module1 = compiledModules[i];

      for (let j = i + 1; j < compiledModules.length; j++) {
        const module2 = compiledModules[j];

        if (module1.prompt === module2.prompt) {
          console.log(`   ✅ [${module1.name}] and [${module2.name}] are identical`);
        } else {
          console.log(`   ⚠️  [${module1.name}] and [${module2.name}] differ:`);
          console.log(`      ${module1.name}: ${module1.prompt.length} chars`);
          console.log(`      ${module2.name}: ${module2.prompt.length} chars`);
          console.log(`      Diff: ${module2.prompt.length - module1.prompt.length} chars`);

          // Find first difference
          for (let k = 0; k < Math.max(module1.prompt.length, module2.prompt.length); k++) {
            if (module1.prompt[k] !== module2.prompt[k]) {
              console.log(`      First diff at position ${k}:`);
              console.log(`        ${module1.name}: ${JSON.stringify(module1.prompt.substring(k, k + 50))}`);
              console.log(`        ${module2.name}: ${JSON.stringify(module2.prompt.substring(k, k + 50))}`);
              break;
            }
          }
        }
      }
    }

    console.log();
  }
}
