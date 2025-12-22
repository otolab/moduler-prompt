import { describe, it, expect } from 'vitest';
import { TestDriver } from '@modular-prompt/driver';
import { agentProcess, type AgentWorkflowContext } from './agent-workflow.js';

describe('agentProcess', () => {
  it('executes planning, execution, and integration phases', async () => {
    const plan = {
      steps: [
        { id: 'step-1', description: 'Collect the required facts' },
        { id: 'step-2', description: 'Summarize the findings' }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Facts collected successfully.',
        'Summary generated from collected facts.',
        'Final answer composed from both steps.'
      ]
    });

    const context: AgentWorkflowContext = {
      objective: 'Answer a research question',
      inputs: { topic: 'TypeScript' }
    };

    const userModule = {
      objective: ['Answer a research question'],
      instructions: ['- Validate information before presenting it']
    };

    const result = await agentProcess(driver, userModule, context);

    expect(result.output).toBe('Final answer composed from both steps.');
    expect(result.context.phase).toBe('complete');
    expect(result.context.executionLog).toHaveLength(2);
    expect(result.metadata?.planSteps).toBe(2);
    expect(result.metadata?.executedSteps).toBe(2);
  });

  it('executes provided actions for steps', async () => {
    const plan = {
      steps: [
        { id: 'step-1', description: 'Fetch additional data', action: 'fetchInfo', params: { id: '123' } }
      ]
    };

    const driver = new TestDriver({
      responses: [
        JSON.stringify(plan),
        'Data analyzed and incorporated.',
        'Integrated output created.'
      ]
    });

    const context: AgentWorkflowContext = {
      objective: 'Enrich the dataset'
    };

    let actionCalled = false;
    const actions = {
      fetchInfo: async (params: any) => {
        actionCalled = true;
        expect(params.id).toBe('123');
        return { payload: 'mock-data' };
      }
    };

    const result = await agentProcess(driver, {}, context, { actions });

    expect(actionCalled).toBe(true);
    expect(result.context.executionLog?.[0].metadata?.actionResult).toEqual({ payload: 'mock-data' });
    expect(result.metadata?.actionsUsed).toBe(1);
  });

  it('uses an existing plan when planning is disabled', async () => {
    const context: AgentWorkflowContext = {
      objective: 'Use the provided plan',
      plan: {
        steps: [
          { id: 'step-1', description: 'Run the saved plan.' }
        ]
      }
    };

    const driver = new TestDriver({
      responses: [
        'Executed saved plan.',
        'Finalized saved plan output.'
      ]
    });

    const result = await agentProcess(driver, {}, context, { enablePlanning: false });

    expect(result.context.plan?.steps[0].id).toBe('step-1');
    expect(result.context.executionLog).toHaveLength(1);
    expect(result.output).toBe('Finalized saved plan output.');
  });
});
