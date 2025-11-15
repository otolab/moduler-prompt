import { writeFileSync } from 'fs';
import { EchoDriver, defaultFormatterTexts } from '@moduler-prompt/driver';
import { compile, merge } from '@moduler-prompt/core';
import { planning } from '../src/workflows/agent-workflow/modules/planning.js';
import { execution } from '../src/workflows/agent-workflow/modules/execution.js';
import { integration } from '../src/workflows/agent-workflow/modules/integration.js';
import type { AgentWorkflowContext, AgentPlan } from '../src/workflows/agent-workflow/types.js';

/**
 * Agent Workflow Prompt Inspection Script
 *
 * このスクリプトは、agent-workflowの各フェーズで生成されるプロンプトを
 * ファイルに出力します。プロンプトの内容を確認し、改善するために使用します。
 */

async function main() {
  const driver = new EchoDriver({
    format: 'text',
    formatterOptions: {
      sectionDescriptions: defaultFormatterTexts.sectionDescriptions
    }
  });

  const outputPath = '/tmp/agent-workflow-prompts.txt';
  const outputs: string[] = [];

  // ユーザーモジュール（例）
  const userModule = {
    objective: ['文書を分析し、重要な洞察を抽出する'],
    instructions: [
      '- 文書の主要なテーマを特定する',
      '- 重要なポイントを3つ抽出する',
      '- 各ポイントを簡潔にまとめる'
    ]
  };

  // 実行計画（例）
  const plan: AgentPlan = {
    steps: [
      { id: 'step-1', description: '文書全体を読み、主要なテーマを特定する' },
      { id: 'step-2', description: '特定したテーマに関連する重要なポイントを3つ抽出する' },
      { id: 'step-3', description: '抽出した各ポイントを簡潔にまとめる' },
      { id: 'step-4', description: 'テーマとポイントを統合し、洞察として整理する' }
    ]
  };

  // ステップ実行結果（例）
  const stepExecutionResults = [
    {
      stepId: 'step-1',
      result: '文書全体を分析し、主要なテーマを特定しました。\n\n特定されたテーマ:\n- イノベーションと技術革新\n- 持続可能性と環境配慮\n- 社会的責任の重視',
      nextState: 'テーマの特定が完了。次はポイントの抽出に進みます。'
    },
    {
      stepId: 'step-2',
      result: '特定したテーマに関連する重要なポイントを抽出しました。\n\n抽出されたポイント:\n1. 技術革新による業務効率化と競争力強化\n2. 環境への配慮と資源の持続的利用\n3. 社会的責任を重視した企業活動',
      nextState: 'ポイントの抽出が完了。次は各ポイントの要約に進みます。'
    },
    {
      stepId: 'step-3',
      result: '各ポイントを簡潔にまとめました。\n\nポイント1: 新技術の導入により業務プロセスを効率化し、市場での競争優位性を確立する\n\nポイント2: 環境負荷を最小限に抑え、再生可能資源の活用を推進する\n\nポイント3: ステークホルダーへの責任を果たし、持続可能な社会の実現に貢献する',
      nextState: 'ポイントの要約が完了。次は全体の統合に進みます。'
    },
    {
      stepId: 'step-4',
      result: 'テーマとポイントを統合し、最終的な洞察としてまとめました。\n\n洞察:\nイノベーションと持続可能性を両立させる戦略的アプローチが重要です。技術革新により効率性と競争力を高めつつ、環境配慮と社会的責任を果たすことで、長期的な企業価値の向上と持続可能な社会の実現を同時に達成できます。',
      nextState: '全ステップが完了しました。統合フェーズに進みます。'
    }
  ];

  // =============================================================================
  // Phase 1: PLANNING
  // =============================================================================
  outputs.push('='.repeat(80));
  outputs.push('Phase 1: PLANNING');
  outputs.push('='.repeat(80));

  const planningContext: AgentWorkflowContext = {
    objective: '文書を分析し、重要な洞察を抽出する',
    inputs: { document: 'サンプルドキュメントの内容...' }
  };

  const mergedPlanning = merge(planning, userModule);
  const planningPrompt = compile(mergedPlanning, planningContext);
  const planningResult = await driver.query(planningPrompt);

  outputs.push(planningResult.content);
  outputs.push('');

  // =============================================================================
  // Phase 2: EXECUTION (all steps)
  // =============================================================================
  const executionLogs = [];
  let currentState = {
    content: '計画を完了しました。実行を開始します。',
    usage: 1200
  };

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    outputs.push('='.repeat(80));
    outputs.push(`Phase 2: EXECUTION (Step ${i + 1}/${plan.steps.length})`);
    outputs.push('='.repeat(80));

    const executionContext: AgentWorkflowContext = {
      objective: '文書を分析し、重要な洞察を抽出する',
      inputs: { document: 'サンプルドキュメントの内容...' },
      plan: plan,
      currentStep: step,
      executionLog: [...executionLogs],
      state: currentState
    };

    const mergedExecution = merge(execution, userModule);
    const executionPrompt = compile(mergedExecution, executionContext);
    const executionResult = await driver.query(executionPrompt);

    outputs.push(executionResult.content);
    outputs.push('');

    // 次のステップのための実行結果を追加
    const stepResult = stepExecutionResults[i];
    executionLogs.push({ stepId: stepResult.stepId, result: stepResult.result });
    currentState = {
      content: stepResult.nextState,
      usage: 1200 + (i + 1) * 500
    };
  }

  // =============================================================================
  // Phase 3: INTEGRATION
  // =============================================================================
  outputs.push('='.repeat(80));
  outputs.push('Phase 3: INTEGRATION');
  outputs.push('='.repeat(80));

  const integrationContext: AgentWorkflowContext = {
    objective: '文書を分析し、重要な洞察を抽出する',
    inputs: { document: 'サンプルドキュメントの内容...' },
    plan: plan,
    executionLog: stepExecutionResults.map(({ stepId, result }) => ({ stepId, result })),
    state: {
      content: '全てのステップが完了しました',
      usage: 4200
    }
  };

  const mergedIntegration = merge(integration, userModule);
  const integrationPrompt = compile(mergedIntegration, integrationContext);
  const integrationResult = await driver.query(integrationPrompt);

  outputs.push(integrationResult.content);

  // ファイルに書き込み
  const content = outputs.join('\n');
  writeFileSync(outputPath, content, 'utf-8');

  console.log(`\n✅ プロンプトを ${outputPath} に出力しました`);
  console.log(`📊 総文字数: ${content.length} 文字`);
  console.log(`📄 総行数: ${outputs.length} 行\n`);

  await driver.close();
}

main().catch(console.error);
