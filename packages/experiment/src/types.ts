/**
 * Common type definitions for module comparison experiments
 */

import type { PromptModule } from '@moduler-prompt/core';
import type { QueryResult } from '@moduler-prompt/driver';

/**
 * Test case definition
 */
export interface TestCase {
  /** Test case name */
  name: string;
  /** Test case description */
  description?: string;
  /** Input context (passed to module.compile) */
  input: any;
  /** Model names to use for this test case (optional, uses all enabled models if not specified) */
  models?: string[];
}

/**
 * Result of a single run
 */
export interface RunResult {
  success: boolean;
  elapsed: number;
  content: string;
  error?: string;
}

/**
 * Test result for a specific module, test case, and model combination
 */
export interface TestResult {
  testCase: string;
  model: string;
  module: string;  // Module name (e.g., 'original', 'merged')
  runs: RunResult[];
}

/**
 * Experiment options parsed from CLI arguments
 */
export interface ExperimentOptions {
  configPath: string;
  testCaseFilter?: string;
  modelFilter?: string;
  moduleFilter?: string[];
  repeatCount: number;
}

/**
 * Module definition for experiments
 */
export interface ModuleDefinition {
  name: string;
  description: string;
  compile: (context: any) => any;
}

/**
 * Evaluation context (common for both code and prompt evaluators)
 */
export interface EvaluationContext {
  moduleName: string;
  prompt: string;  // Compiled prompt (stringified)
  runs: Array<{
    queryResult: QueryResult;
  }>;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  evaluator: string;
  moduleName: string;
  score?: number;
  reasoning?: string;
  details?: Record<string, any>;
  raw?: any;
  error?: string;
}

/**
 * Code evaluator definition (exported from external file)
 */
export interface CodeEvaluator {
  name: string;
  description: string;
  evaluate: (context: EvaluationContext) => Promise<EvaluationResult>;
}

/**
 * Prompt evaluator definition (exported from external file)
 */
export interface PromptEvaluator {
  name: string;
  description: string;
  module: PromptModule<EvaluationContext>;
}

/**
 * Evaluator reference in config file
 */
export type EvaluatorReference =
  | { name: string; path: string; description?: string }
  | { name: string; prompt: PromptModule<EvaluationContext>; description?: string };

/**
 * Extended experiment options with evaluation support
 */
export interface ExtendedExperimentOptions extends ExperimentOptions {
  enableEvaluation?: boolean;
  evaluatorFilter?: string[];
}
