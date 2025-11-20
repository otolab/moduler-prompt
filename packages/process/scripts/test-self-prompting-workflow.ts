import { selfPromptingProcess } from '../src/workflows/self-prompting-workflow/self-prompting-workflow.js';
import { MlxDriver } from '@moduler-prompt/driver';
import { defaultLogger, LogLevel } from '@moduler-prompt/utils';
import { platform } from 'os';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Self-Prompting Workflow Test Runner
 *
 * プロンプトを与えて結果を見る汎用テストスクリプト
 *
 * Usage:
 *   npx tsx scripts/test-self-prompting-workflow.ts [test-case-file]
 *
 * Example:
 *   npx tsx scripts/test-self-prompting-workflow.ts
 *   npx tsx scripts/test-self-prompting-workflow.ts test-cases/meal-planning.json
 *
 * Environment Variables:
 *   MLX_MODEL: Model to use (default: mlx-community/gemma-3-27b-it-qat-4bit)
 *   SKIP_MLX_TESTS: Skip MLX tests (default: false)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MLXはApple Silicon専用
const shouldSkipMLX =
  platform() !== 'darwin' ||
  process.env.CI === 'true' ||
  process.env.SKIP_MLX_TESTS === 'true';

interface TestCase {
  name: string;
  description?: string;
  module: any;
  context: any;
}

function loadTestCase(filePath: string): TestCase {
  // 絶対パス、または現在の作業ディレクトリからの相対パス
  const fullPath = filePath.startsWith('/')
    ? filePath
    : join(process.cwd(), filePath);

  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  if (shouldSkipMLX) {
    console.log('⚠️  MLX tests are skipped (not on Apple Silicon or CI environment)');
    return;
  }

  // Get test case file from command line argument or use default based on LANG
  const lang = process.env.LANG || 'ja';
  const defaultTestCase = lang === 'en'
    ? 'test-cases/meal-planning-en.json'
    : 'test-cases/meal-planning.json';
  const testCaseFile = process.argv[2] || defaultTestCase;
  const testCase = loadTestCase(testCaseFile);

  // Model selection - can be overridden by environment variable
  const modelName = process.env.MLX_MODEL || 'mlx-community/gemma-3-27b-it-qat-4bit';

  console.log(`🧪 Self-Prompting Workflow Test: ${testCase.name}\n`);
  if (testCase.description) {
    console.log(`📝 ${testCase.description}\n`);
  }
  console.log(`📦 Model: ${modelName}`);
  console.log(`🎨 Output Mode: Freeform (自由記述)\n`);

  // Logger setup for debug output
  defaultLogger.setLevel(LogLevel.DEBUG);
  defaultLogger.setDebug(true);

  // MLX Driver setup
  const driver = new MlxDriver({
    model: modelName,
    defaultOptions: {
      maxTokens: 800,
      temperature: 0.3,
      topP: 0.9
    }
  });

  console.log('📋 Test Case Module:');
  console.log(JSON.stringify(testCase.module, null, 2));
  console.log('');
  console.log('📋 Initial Context:');
  console.log(JSON.stringify(testCase.context, null, 2));
  console.log('');

  try {
    // Run the workflow
    console.log('⚙️  Running self-prompting workflow...\n');
    const result = await selfPromptingProcess(driver, testCase.module, testCase.context, {
      logger: defaultLogger
    });

    // Display results
    console.log('✅ Workflow completed!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(80));
    console.log(`Phase: ${result.context.phase}`);
    console.log(`Steps in plan: ${result.context.plan?.steps.length || 0}`);
    console.log(`Steps executed: ${result.context.executionLog?.length || 0}`);
    console.log('');
    console.log('Plan:');
    result.context.plan?.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. [${step.id}]`);
      console.log(`     Instructions: ${step.prompt.instructions.length} items`);
      console.log(`     Data: ${step.prompt.data.length} items`);
    });
    console.log('');
    console.log('Final output:');
    console.log(result.output);
    console.log('');
    console.log('Metadata:');
    console.log(JSON.stringify(result.metadata, null, 2));
    console.log('─'.repeat(80));

    // Verify execution log
    console.log('\n📝 Execution Log:');
    result.context.executionLog?.forEach((log, index) => {
      console.log(`\n[Step ${index + 1}] ${log.stepId}`);
      console.log(log.result);
    });

    console.log(`\n✨ ${testCase.name} completed successfully!\n`);
  } catch (error) {
    console.error('❌ Error during workflow execution:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

main().catch(console.error);
