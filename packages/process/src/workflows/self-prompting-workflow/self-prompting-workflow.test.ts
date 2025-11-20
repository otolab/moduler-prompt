import { describe, it, expect } from 'vitest';
import { selfPromptingProcess } from './self-prompting-workflow.js';
import { TestDriver } from '@moduler-prompt/driver';
import type { SelfPromptingWorkflowContext, SelfPromptingPlan } from './types.js';

describe('selfPromptingProcess', () => {
  it('should execute a simple self-prompting workflow', async () => {
    // Mock plan with complete prompts
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: {
            instructions: [
              'Analyze the input data carefully',
              'Identify key patterns and themes',
              'Document your findings clearly'
            ],
            data: [
              'Input data: test data'
            ]
          }
        },
        {
          id: 'step-2',
          prompt: {
            instructions: [
              'Use the analysis results from step-1',
              'Generate a structured output',
              'Include key insights'
            ],
            data: []
          }
        }
      ]
    };

    // Mock responses (4 total: planning + 2 execution + integration)
    const driver = new TestDriver({
      responses: [
        // Planning - return JSON for structured output
        JSON.stringify(plan),
        // Execution: step 1 - freeform text output
        'Analysis complete: Input analyzed successfully',
        // Execution: step 2 - freeform text output
        'Output generated successfully',
        // Integration
        'Final result: Task completed successfully'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
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

    const result = await selfPromptingProcess(driver, userModule, context);

    expect(result.output).toBe('Final result: Task completed successfully');
    expect(result.context.phase).toBe('complete');
    expect(result.context.executionLog).toHaveLength(2);
    expect(result.context.executionLog?.[0].result).toBe('Analysis complete: Input analyzed successfully');
    expect(result.context.executionLog?.[1].result).toBe('Output generated successfully');
    expect(result.metadata?.planSteps).toBe(2);
    expect(result.metadata?.executedSteps).toBe(2);
  });

  it('should handle actions in workflow', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: {
            instructions: [
              'Retrieve data using the provided tool',
              'Validate the retrieved data',
              'Prepare data for processing'
            ],
            data: ['Data ID: 123']
          },
          actions: [
            {
              tool: 'getData',
              params: { id: '123' }
            }
          ]
        },
        {
          id: 'step-2',
          prompt: {
            instructions: [
              'Process the retrieved data',
              'Generate analysis report'
            ],
            data: []
          }
        }
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
        'Data retrieved and processed',
        'Processing complete',
        'Final output'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
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

    const result = await selfPromptingProcess(driver, userModule, context, { actions });

    expect(actionCalled).toBe(true);
    expect(result.context.executionLog?.[0].actionResult).toEqual({ result: 'data retrieved' });
    expect(result.metadata?.actionsUsed).toBe(1);
  });

  it('should limit steps to maxSteps', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: { instructions: ['Step 1 task'], data: [] }
        },
        {
          id: 'step-2',
          prompt: { instructions: ['Step 2 task'], data: [] }
        },
        {
          id: 'step-3',
          prompt: { instructions: ['Step 3 task'], data: [] }
        },
        {
          id: 'step-4',
          prompt: { instructions: ['Step 4 task'], data: [] }
        },
        {
          id: 'step-5',
          prompt: { instructions: ['Step 5 task'], data: [] }
        },
        {
          id: 'step-6',
          prompt: { instructions: ['Step 6 task'], data: [] }
        }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Step 1 done',
        'Step 2 done',
        'Step 3 done',
        'Final'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
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

    const result = await selfPromptingProcess(driver, userModule, context, { maxSteps: 3 });

    expect(result.context.executionLog).toHaveLength(3);
    expect(result.metadata?.executedSteps).toBe(3);
  });

  it('should use existing plan when provided', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: {
            instructions: [
              'Execute the task',
              'Record the results'
            ],
            data: []
          }
        }
      ]
    };

    const driver = new TestDriver({
      responses: [
        // No planning needed - only execution + integration
        'Step executed',
        'Integration done'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
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

    const result = await selfPromptingProcess(driver, userModule, context, { enablePlanning: false });

    expect(result.context.executionLog).toHaveLength(1);
    expect(result.output).toBe('Integration done');
  });

  it('should handle workflow error in planning phase', async () => {
    const driver = new TestDriver({
      responses: [
        { content: 'Partial planning...', finishReason: 'length' }
      ]
    });

    const context: SelfPromptingWorkflowContext = {
      objective: 'Test error handling'
    };

    const userModule = {
      objective: ['エラーハンドリングのテスト'],
      instructions: ['- 計画フェーズでエラーが発生']
    };

    await expect(async () => {
      await selfPromptingProcess(driver, userModule, context);
    }).rejects.toThrow('Planning failed with reason: length');
  });

  it('should handle workflow error in execution phase', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: { instructions: ['First step'], data: [] }
        },
        {
          id: 'step-2',
          prompt: { instructions: ['Second step'], data: [] }
        }
      ]
    };

    const driver = new TestDriver({
      responses: [
        // Planning (returns valid plan)
        JSON.stringify(plan),
        // Execution: step 1 succeeds
        'Step 1 done',
        // Execution: step 2 fails with error
        { content: 'Partial execution...', finishReason: 'error' }
      ]
    });

    const context: SelfPromptingWorkflowContext = {
      objective: 'Test execution error handling'
    };

    const userModule = {
      objective: ['実行フェーズでのエラーハンドリング'],
      instructions: ['- 2番目のステップでエラーが発生']
    };

    await expect(async () => {
      await selfPromptingProcess(driver, userModule, context);
    }).rejects.toThrow('Execution failed with reason: error');
  });

  it('should handle action errors', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: {
            instructions: ['Action step'],
            data: []
          },
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

    const context: SelfPromptingWorkflowContext = {
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
      await selfPromptingProcess(driver, userModule, context, { actions });
    }).rejects.toThrow('Action failed');
  });

  it('should resume from partial execution', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: { instructions: ['First step'], data: [] }
        },
        {
          id: 'step-2',
          prompt: { instructions: ['Second step'], data: [] }
        },
        {
          id: 'step-3',
          prompt: { instructions: ['Third step'], data: [] }
        }
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
        'Second step completed',
        'Third step completed',
        'All steps integrated'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
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

    const result = await selfPromptingProcess(driver, userModule, context, { enablePlanning: false });

    expect(result.context.executionLog).toHaveLength(3);
    expect(result.context.executionLog?.[0].stepId).toBe('step-1');
    expect(result.context.executionLog?.[1].stepId).toBe('step-2');
    expect(result.context.executionLog?.[2].stepId).toBe('step-3');
  });
});
