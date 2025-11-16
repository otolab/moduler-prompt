import { agentProcess } from '../src/workflows/agent-workflow/agent-workflow.js';
import { MlxDriver } from '@moduler-prompt/driver';
import { defaultLogger, LogLevel } from '@moduler-prompt/utils';
import { platform } from 'os';

/**
 * Agent Workflow - Meal Planning Test
 *
 * 冷蔵庫の材料と過去の献立から、今日の献立を検討します
 */

// MLXはApple Silicon専用
const shouldSkipMLX =
  platform() !== 'darwin' ||
  process.env.CI === 'true' ||
  process.env.SKIP_MLX_TESTS === 'true';

async function main() {
  if (shouldSkipMLX) {
    console.log('⚠️  MLX tests are skipped (not on Apple Silicon or CI environment)');
    return;
  }

  // Model selection - can be overridden by environment variable
  const modelName = process.env.MLX_MODEL || 'mlx-community/gemma-3-27b-it-qat-4bit';

  console.log('🍽️  Meal Planning Workflow Test\n');
  console.log(`📦 Model: ${modelName}\n`);

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

  // User's module - 献立検討のワークフロー
  const userModule = {
    objective: ['今日の夕飯の献立を決定する'],
    instructions: [
      '- 冷蔵庫の材料から作れる主菜候補を検討する',
      '- 過去の献立と比較し、似たものが続かないようにする',
      '- 選んだ主菜に合う副菜を提案する',
      '- 不足している材料があれば買い出しリストを作成する'
    ]
  };

  // Initial context - 冷蔵庫の材料と過去の献立
  const context = {
    objective: '今日の夕飯の献立を決定する',
    inputs: {
      refrigerator: {
        proteins: ['鶏もも肉 300g', '豚バラ肉 200g', '卵 6個', '豆腐 1丁'],
        vegetables: ['キャベツ', '人参', '玉ねぎ 2個', 'じゃがいも 3個', 'ピーマン', 'もやし'],
        seasonings: ['醤油', 'みりん', '酒', '味噌', 'サラダ油', 'ごま油', '塩', 'コショウ'],
        other: ['ご飯', '乾燥わかめ']
      },
      pastMeals: [
        { date: '昨日', mainDish: 'カレーライス（豚肉・じゃがいも・人参・玉ねぎ）' },
        { date: '一昨日', mainDish: '生姜焼き（豚肉・玉ねぎ）' },
        { date: '3日前', mainDish: '鶏の照り焼き（鶏もも肉）' }
      ]
    }
  };

  console.log('📋 Initial Context:');
  console.log(JSON.stringify(context, null, 2));
  console.log('');

  try {
    // Run the workflow
    console.log('⚙️  Running meal planning workflow...\n');
    const result = await agentProcess(driver, userModule, context, { logger: defaultLogger });

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
      console.log(`  ${i + 1}. [${step.id}] ${step.description}`);
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

    console.log('\n✨ Meal planning completed successfully!\n');
  } catch (error) {
    console.error('❌ Error during workflow execution:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

main().catch(console.error);
