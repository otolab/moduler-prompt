import { describe, it, expect } from 'vitest';
import { selfPromptingProcess } from './self-prompting-workflow.js';
import { TestDriver } from '@modular-prompt/driver';
import type { SelfPromptingWorkflowContext, SelfPromptingPlan } from './types.js';

describe('selfPromptingProcess', () => {
  it('should execute a simple self-prompting workflow', async () => {
    // Mock plan with complete prompts
    const plan: SelfPromptingPlan = {
      steps: [
        {
          id: 'step-1',
          prompt: 'Analyze the input data carefully. The data is: test data. Identify key patterns and themes, and document your findings clearly.'
        },
        {
          id: 'step-2',
          prompt: 'Generate a structured output based on the analysis. Include key insights from the previous analysis.'
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
          prompt: 'Fetch user data with ID 123 using the getData tool.',
          actions: [
            {
              tool: 'getData',
              params: { id: '123' }
            }
          ]
        },
        {
          id: 'step-2',
          prompt: 'Process the retrieved data and generate an analysis report.'
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

    const context: SelfPromptingWorkflowContext = {};

    const userModule = {
      objective: ['ユーザーデータを取得し、レポートを生成する'],
      instructions: ['getData actionを使用してデータを取得する']
    };

    const result = await selfPromptingProcess(driver, userModule, context, {
      actions
    });

    expect(actionCalled).toBe(true);
    expect(result.output).toBe('Final output');
    expect(result.metadata?.actionsUsed).toBe(1);
  });

  it('should respect maxSteps limit', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        { id: 'step-1', prompt: 'First step' },
        { id: 'step-2', prompt: 'Second step' },
        { id: 'step-3', prompt: 'Third step' },
        { id: 'step-4', prompt: 'Fourth step' },
        { id: 'step-5', prompt: 'Fifth step' },
        { id: 'step-6', prompt: 'Sixth step (should be cut off)' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Step 1',
        'Step 2',
        'Step 3',
        'Integration output'
      ]
    });

    const context: SelfPromptingWorkflowContext = {};

    const result = await selfPromptingProcess(driver, {
      objective: ['Test max steps'],
      instructions: ['Execute multiple steps']
    }, context, { maxSteps: 3 });

    expect(result.context.plan?.steps).toHaveLength(3);
    expect(result.metadata?.planSteps).toBe(3);
  });

  it('should handle empty inputs', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        { id: 'step-1', prompt: 'Execute first step without inputs' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Step 1 result',
        'Final output'
      ]
    });

    const context: SelfPromptingWorkflowContext = {};

    const result = await selfPromptingProcess(driver, {
      objective: ['Test without inputs'],
      instructions: []
    }, context);

    expect(result.output).toBe('Final output');
    expect(result.context.phase).toBe('complete');
  });

  it('should handle workflow with only objective', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        { id: 'step-1', prompt: 'Execute the objective: Create a summary' },
        { id: 'step-2', prompt: 'Finalize the summary output' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Summary created',
        'Summary finalized',
        'Complete summary output'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
      inputs: { text: 'Document content' }
    };

    const result = await selfPromptingProcess(driver, {
      objective: ['文書の要約を作成する']
    }, context);

    expect(result.output).toBe('Complete summary output');
    expect(result.metadata?.executedSteps).toBe(2);
  });

  it('should execute workflow with existing plan', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        { id: 'step-1', prompt: 'First step with existing plan' },
        { id: 'step-2', prompt: 'Second step with existing plan' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        'First step result',
        'Second step result',
        'Integration result'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
      plan
    };

    const result = await selfPromptingProcess(driver, {
      objective: ['Use existing plan'],
      instructions: []
    }, context, { enablePlanning: false });

    expect(result.output).toBe('Integration result');
    expect(result.metadata?.executedSteps).toBe(2);
  });

  it('should handle partial execution log', async () => {
    const plan: SelfPromptingPlan = {
      steps: [
        { id: 'step-1', prompt: 'First step' },
        { id: 'step-2', prompt: 'Second step' },
        { id: 'step-3', prompt: 'Third step' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        'Second step result',
        'Third step result',
        'Integration result'
      ]
    });

    const context: SelfPromptingWorkflowContext = {
      plan,
      executionLog: [
        { stepId: 'step-1', result: 'Already executed' }
      ]
    };

    const result = await selfPromptingProcess(driver, {
      objective: ['Resume execution'],
      instructions: []
    }, context, { enablePlanning: false });

    expect(result.context.executionLog).toHaveLength(3);
    expect(result.context.executionLog?.[0].result).toBe('Already executed');
    expect(result.context.executionLog?.[1].result).toBe('Second step result');
    expect(result.context.executionLog?.[2].result).toBe('Third step result');
  });

  it('should handle errors during planning', async () => {
    const driver = new TestDriver({
      responses: ['Invalid JSON that will fail parsing']
    });

    const context: SelfPromptingWorkflowContext = {};

    await expect(
      selfPromptingProcess(driver, {
        objective: ['Test error handling'],
        instructions: []
      }, context)
    ).rejects.toThrow();
  });
});
