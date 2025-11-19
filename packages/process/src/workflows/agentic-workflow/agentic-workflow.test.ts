import { describe, it, expect } from 'vitest';
import { agenticProcess } from './agentic-workflow.js';
import { TestDriver } from '@moduler-prompt/driver';
import type { AgenticWorkflowContext, AgenticPlan } from './types.js';

describe('agenticProcess', () => {
  it('should execute a simple agent workflow', async () => {
    // Mock plan
    const plan: AgenticPlan = {
      steps: [
        { id: 'step-1', description: 'Analyze the input' },
        { id: 'step-2', description: 'Generate output' }
      ]
    };

    // Mock responses (4 total: planning + 2 execution + integration)
    const driver = new TestDriver({
      responses: [
        // Planning - return JSON for structured output
        JSON.stringify(plan),
        // Execution: step 1 - structured output with result and nextState
        JSON.stringify({ result: 'Analysis complete: Input analyzed successfully', nextState: 'Ready for output generation' }),
        // Execution: step 2 - structured output with result and nextState
        JSON.stringify({ result: 'Output generated successfully', nextState: 'Ready for integration' }),
        // Integration
        'Final result: Task completed successfully'
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Analyze the document and extract insights',
      inputs: { data: 'test data' }
    };

    // User's module
    const userModule = {
      objective: ['文書を分析し、重要な洞察を抽出する'],
      instructions: [
        '- 文書の主要なテーマを特定する',
        '- 重要なポイントを3つ抽出する',
        '- 各ポイントを簡潔にまとめる'
      ]
    };

    const result = await agenticProcess(driver, userModule, context);

    expect(result.output).toBe('Final result: Task completed successfully');
    expect(result.context.phase).toBe('complete');
    expect(result.context.executionLog).toHaveLength(2);
    expect(result.context.executionLog?.[0].result).toBe('Analysis complete: Input analyzed successfully');
    expect(result.context.executionLog?.[1].result).toBe('Output generated successfully');
    // nextState is stored in context.state, updated after each step
    expect(result.context.state?.content).toBe('Ready for integration');
    expect(result.metadata?.planSteps).toBe(2);
    expect(result.metadata?.executedSteps).toBe(2);
  });

  it('should handle actions in workflow', async () => {
    const plan: AgenticPlan = {
      steps: [
        {
          id: 'step-1',
          description: 'Get data',
          actions: [
            {
              tool: 'getData',
              params: { id: '123' }
            }
          ]
        },
        { id: 'step-2', description: 'Process data' }
      ]
    };

    let actionCalled = false;
    const actions = {
      getData: async (params: any) => {
        actionCalled = true;
        expect(params.id).toBe('123');
        return { result: 'data retrieved' };
      }
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        JSON.stringify({ result: 'Data retrieved and processed', nextState: 'Data available for processing' }),
        JSON.stringify({ result: 'Processing complete', nextState: 'Ready for final output' }),
        'Final output'
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Fetch user data and generate report'
    };

    const userModule = {
      objective: ['ユーザーデータを取得し、レポートを生成する'],
      instructions: [
        '- データを適切なフォーマットで取得',
        '- 集計結果を分かりやすく整形',
        '- サマリーを含めたレポートを作成'
      ]
    };

    const result = await agenticProcess(driver, userModule, context, { actions });

    expect(actionCalled).toBe(true);
    expect(result.context.executionLog?.[0].actionResult).toEqual({ result: 'data retrieved' });
    expect(result.metadata?.actionsUsed).toBe(1);
  });

  it('should limit steps to maxSteps', async () => {
    const plan: AgenticPlan = {
      steps: [
        { id: 'step-1', description: 'Step 1' },
        { id: 'step-2', description: 'Step 2' },
        { id: 'step-3', description: 'Step 3' },
        { id: 'step-4', description: 'Step 4' },
        { id: 'step-5', description: 'Step 5' },
        { id: 'step-6', description: 'Step 6' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        JSON.stringify({ result: 'Step 1 done', nextState: 'Step 1 complete' }),
        JSON.stringify({ result: 'Step 2 done', nextState: 'Step 2 complete' }),
        JSON.stringify({ result: 'Step 3 done', nextState: 'Step 3 complete' }),
        'Final'
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Summarize technical specification'
    };

    const userModule = {
      objective: ['技術仕様書を要約する'],
      instructions: [
        '- 各セクションの内容を理解する',
        '- 重要な技術要件を抽出する',
        '- 全体の概要をまとめる'
      ]
    };

    const result = await agenticProcess(driver, userModule, context, { maxSteps: 3 });

    expect(result.context.executionLog).toHaveLength(3);
    expect(result.metadata?.executedSteps).toBe(3);
  });

  it('should use existing plan when provided', async () => {
    const plan: AgenticPlan = {
      steps: [
        { id: 'step-1', description: 'Execute step' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        // No planning needed - only execution + integration
        JSON.stringify({ result: 'Step executed', nextState: 'Execution complete' }),
        'Integration done'
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Create monthly sales report',
      plan // Plan already provided
    };

    const userModule = {
      objective: ['月次売上レポートを作成する'],
      instructions: [
        '- 売上データを集計する',
        '- グラフとチャートを作成する',
        '- サマリーレポートにまとめる'
      ]
    };

    const result = await agenticProcess(driver, userModule, context, { enablePlanning: false });

    expect(result.context.executionLog).toHaveLength(1);
    expect(result.output).toBe('Integration done');
  });

  it('should handle workflow error in planning phase', async () => {
    const driver = new TestDriver({
      responses: [
        { content: 'Partial planning...', finishReason: 'length' }
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Test error handling'
    };

    const userModule = {
      objective: ['エラーハンドリングのテスト'],
      instructions: ['- 計画フェーズでエラーが発生']
    };

    await expect(async () => {
      await agenticProcess(driver, userModule, context);
    }).rejects.toThrow('Planning failed with reason: length');
  });

  it('should handle workflow error in execution phase', async () => {
    const plan: AgenticPlan = {
      steps: [
        { id: 'step-1', description: 'First step' },
        { id: 'step-2', description: 'Second step' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        // Planning (returns valid plan)
        JSON.stringify(plan),
        // Execution: step 1 succeeds
        JSON.stringify({ result: 'Step 1 done', nextState: 'Moving to step 2' }),
        // Execution: step 2 fails with error
        { content: 'Partial execution...', finishReason: 'error' }
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Test execution error handling'
    };

    const userModule = {
      objective: ['実行フェーズでのエラーハンドリング'],
      instructions: ['- 2番目のステップでエラーが発生']
    };

    await expect(async () => {
      await agenticProcess(driver, userModule, context);
    }).rejects.toThrow('Step execution failed with reason: error');
  });

  it('should handle action errors', async () => {
    const plan: AgenticPlan = {
      steps: [
        {
          id: 'step-1',
          description: 'Action step',
          actions: [
            {
              tool: 'failingAction'
            }
          ]
        }
      ]
    };

    const actions = {
      failingAction: async () => {
        throw new Error('Action failed');
      }
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan)
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Process customer feedback'
    };

    const userModule = {
      objective: ['顧客フィードバックを処理する'],
      instructions: [
        '- フィードバックを収集する',
        '- カテゴリ別に分類する',
        '- 改善提案をまとめる'
      ]
    };

    await expect(async () => {
      await agenticProcess(driver, userModule, context, { actions });
    }).rejects.toThrow("Tool 'failingAction' failed: Action failed");
  });

  it('should resume from partial execution', async () => {
    const plan: AgenticPlan = {
      steps: [
        { id: 'step-1', description: 'First step' },
        { id: 'step-2', description: 'Second step' },
        { id: 'step-3', description: 'Third step' }
      ]
    };

    // Partial execution log (already completed step-1)
    const executionLog = [
      { stepId: 'step-1', result: 'First step completed' }
    ];

    const driver = new TestDriver({
      responses: [
        // No planning needed (plan already exists)
        // Only step-2 and step-3 execution + integration
        JSON.stringify({ result: 'Second step completed', nextState: 'Ready for step 3' }),
        JSON.stringify({ result: 'Third step completed', nextState: 'All steps done' }),
        'All steps integrated'
      ]
    });

    const context: AgenticWorkflowContext = {
      objective: 'Analyze the document and summarize',
      plan,
      executionLog,
      state: { content: 'Ready for step 2' } // State from previous step
    };

    // Same user module as initial execution
    const userModule = {
      objective: ['文書を分析し、要約する'],
      instructions: [
        '- 文書の構造を把握する',
        '- 重要な情報を抽出する',
        '- 簡潔な要約を作成する'
      ]
    };

    const result = await agenticProcess(driver, userModule, context, { enablePlanning: false });

    expect(result.context.executionLog).toHaveLength(3);
    expect(result.context.executionLog?.[0].stepId).toBe('step-1');
    expect(result.context.executionLog?.[1].stepId).toBe('step-2');
    expect(result.context.executionLog?.[2].stepId).toBe('step-3');
  });
});
