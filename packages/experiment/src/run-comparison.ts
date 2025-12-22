#!/usr/bin/env node
/**
 * Module Comparison Experiment
 *
 * Compares the performance and output quality of multiple prompt modules.
 *
 * Usage:
 *   moduler-experiment <config> [options]
 *
 * Arguments:
 *   <config>             Config file path (YAML, TypeScript, or JavaScript)
 *
 * Options:
 *   --test-case <name>   Test case name filter
 *   --model <provider>   Model provider filter (mlx, vertexai, googlegenai)
 *   --modules <names>    Comma-separated module names (default: all)
 *   --repeat <count>     Number of repetitions (default: 1)
 *   --evaluate           Enable evaluation phase
 *   --evaluators <names> Comma-separated evaluator names (default: all)
 */

import { parseArgs } from './cli/args.js';
import { loadExperimentConfig } from './config/loader.js';
import { loadModules, loadEvaluators } from './config/dynamic-loader.js';
import { DriverManager } from './runner/driver-manager.js';
import { ExperimentRunner } from './runner/experiment.js';
import { StatisticsReporter } from './reporter/statistics.js';

// Parse CLI arguments
const options = parseArgs();

// Display header
console.log('='.repeat(80));
console.log('Module Comparison Experiment');
console.log('='.repeat(80));
console.log(`Config: ${options.configPath}`);
console.log(`Test case filter: ${options.testCaseFilter || 'all'}`);
console.log(`Model filter: ${options.modelFilter || 'all enabled models'}`);
console.log(`Modules: ${options.moduleFilter?.join(', ') || 'all'}`);
console.log(`Repeat: ${options.repeatCount} time(s)`);
console.log(`Evaluation: ${options.enableEvaluation ? 'enabled' : 'disabled'}`);
if (options.enableEvaluation) {
  console.log(`Evaluators: ${options.evaluatorFilter?.join(', ') || 'all'}`);
}
console.log('='.repeat(80));
console.log();

// Load configuration
const {
  serverConfig,
  modules: configModules,
  testCases: configTestCases,
  evaluators: configEvaluators,
  aiService,
  configDir
} = await loadExperimentConfig(options.configPath);

// Filter test models (role: test or no role)
let models = serverConfig.models.filter((m: any) =>
  m.enabled !== false && (!m.role || m.role === 'test')
);
if (options.modelFilter) {
  models = models.filter((m: any) => m.provider === options.modelFilter);
  if (models.length === 0) {
    console.error(`❌ No enabled test models found for provider: ${options.modelFilter}`);
    process.exit(1);
  }
}

console.log(`📋 Testing with ${models.length} model(s):`);
models.forEach((m: any) => console.log(`  - ${m.model} (${m.provider})`));
console.log();

// Load test cases
const allTestCases = configTestCases;
const testCases = options.testCaseFilter
  ? allTestCases.filter((tc: any) => tc.name === options.testCaseFilter)
  : allTestCases;

if (testCases.length === 0) {
  console.error(`❌ No test cases found${options.testCaseFilter ? ` matching: ${options.testCaseFilter}` : ''}`);
  console.error('   Please add test cases to config file');
  process.exit(1);
}

console.log(`🧪 Running ${testCases.length} test case(s)`);
console.log();

// Load modules (from module references)
const allModules = await loadModules(configModules, configDir);
const modules = options.moduleFilter
  ? allModules.filter(m => options.moduleFilter!.includes(m.name))
  : allModules;

if (modules.length === 0) {
  console.error('❌ No modules to test');
  console.error('   Please add modules to config file');
  process.exit(1);
}

console.log(`📦 Testing ${modules.length} module(s):`);
modules.forEach(m => console.log(`  - ${m.name}: ${m.description}`));
console.log();

// Get evaluators and evaluator model if evaluation is enabled
let evaluators;
let evaluatorModel;
if (options.enableEvaluation) {
  // Load evaluators (from evaluator references)
  const allEvaluators = await loadEvaluators(configEvaluators, configDir);
  evaluators = options.evaluatorFilter
    ? allEvaluators.filter(e => options.evaluatorFilter!.includes(e.name))
    : allEvaluators;

  if (evaluators.length === 0) {
    console.error('❌ No evaluators found');
    process.exit(1);
  }

  // Find evaluator model from evaluation config
  if (!serverConfig.evaluation || !serverConfig.evaluation.enabled) {
    console.error('❌ Evaluation is not configured in config file');
    console.error('   Please add evaluation section to your config.yaml:');
    console.error('   evaluation:');
    console.error('     enabled: true');
    console.error('     model: "model-name"');
    console.error('     provider: "provider-name"');
    process.exit(1);
  }

  const evaluationConfig = serverConfig.evaluation;

  // Find the specified model
  evaluatorModel = serverConfig.models.find((m: any) =>
    m.enabled !== false &&
    m.model === evaluationConfig.model &&
    m.provider === evaluationConfig.provider
  );

  if (!evaluatorModel) {
    console.error(`❌ Evaluator model not found: ${evaluationConfig.model} (${evaluationConfig.provider})`);
    console.error('   Please ensure the model is defined in the models section and enabled');
    process.exit(1);
  }

  console.log(`🔍 Evaluation enabled with ${evaluators.length} evaluator(s):`);
  evaluators.forEach(e => console.log(`  - [${e.type}] ${e.name}: ${e.description}`));
  console.log(`🔍 Evaluator model: ${evaluatorModel.model} (${evaluatorModel.provider})`);
  console.log();
}

// Run experiment
const driverManager = new DriverManager();
const runner = new ExperimentRunner(
  aiService,
  driverManager,
  modules,
  testCases,
  models,
  options.repeatCount,
  evaluators,
  evaluatorModel
);

const results = await runner.run();

// Display completion
console.log('='.repeat(80));
console.log('✨ Experiment completed');
console.log('='.repeat(80));

// Cleanup drivers
await driverManager.cleanup();

// Display statistics if repeated
if (options.repeatCount > 1) {
  const reporter = new StatisticsReporter(results);
  reporter.report();
}
