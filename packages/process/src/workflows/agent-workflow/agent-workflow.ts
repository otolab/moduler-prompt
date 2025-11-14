import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { WorkflowExecutionError } from '../types.js';
import type { AIDriver, WorkflowResult } from '../types.js';
import type { AgentWorkflowContext, AgentWorkflowOptions, AgentPlan, AgentExecutionLog, ActionHandler } from './types.js';
import { agentic } from './modules/agentic.js';
import { planning } from './modules/planning.js';
import { execution } from './modules/execution.js';
import { integration } from './modules/integration.js';

/**
 * Execute planning phase
 */
async function executePlanningPhase(
  driver: AIDriver,
  module: PromptModule<AgentWorkflowContext>,
  context: AgentWorkflowContext,
  maxSteps: number
): Promise<AgentPlan> {
  const planningModule = merge(agentic, planning, module);
  const prompt = compile(planningModule, context);

  try {
    const planResult = await driver.query(prompt);

    // Check finish reason
    if (planResult.finishReason && planResult.finishReason !== 'stop') {
      throw new WorkflowExecutionError(
        `Planning failed with reason: ${planResult.finishReason}`,
        context,
        {
          phase: 'planning',
          finishReason: planResult.finishReason
        }
      );
    }

    // Get plan from structured output
    if (!planResult.structuredOutput) {
      throw new WorkflowExecutionError(
        'Planning did not return structured output',
        context,
        {
          phase: 'planning',
          partialResult: planResult.content
        }
      );
    }

    const plan = planResult.structuredOutput as AgentPlan;

    // Validate and limit steps
    if (!plan.steps || !Array.isArray(plan.steps)) {
      throw new WorkflowExecutionError(
        'Invalid plan structure: steps is not an array',
        context,
        {
          phase: 'planning',
          partialResult: JSON.stringify(planResult.structuredOutput)
        }
      );
    }

    // Limit number of steps
    if (plan.steps.length > maxSteps) {
      plan.steps = plan.steps.slice(0, maxSteps);
    }

    return plan;

  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      throw error;
    }
    throw new WorkflowExecutionError(error as Error, context, {
      phase: 'planning'
    });
  }
}

/**
 * Execute a single step
 */
async function executeStep(
  driver: AIDriver,
  module: PromptModule<AgentWorkflowContext>,
  context: AgentWorkflowContext,
  step: AgentPlan['steps'][number],
  actions: Record<string, ActionHandler>,
  executionLog: AgentExecutionLog[]
): Promise<AgentExecutionLog> {
  // Execute action if specified
  let actionResult: any;
  if (step.action && actions[step.action]) {
    try {
      actionResult = await actions[step.action](step.params, context);
    } catch (error) {
      throw new WorkflowExecutionError(
        `Action '${step.action}' failed: ${(error as Error).message}`,
        {
          ...context,
          executionLog,
          currentStep: step
        },
        {
          phase: 'execution',
          partialResult: executionLog.map(log => log.result).join('\n\n')
        }
      );
    }
  }

  // Execute step with AI
  const executionModule = merge(agentic, execution, module);
  const stepContext: AgentWorkflowContext = {
    ...context,
    currentStep: step,
    actionResult,
    executionLog
  };

  const prompt = compile(executionModule, stepContext);

  try {
    const stepResult = await driver.query(prompt);

    // Check finish reason
    if (stepResult.finishReason && stepResult.finishReason !== 'stop') {
      throw new WorkflowExecutionError(
        `Step execution failed with reason: ${stepResult.finishReason}`,
        stepContext,
        {
          phase: 'execution',
          partialResult: executionLog.map(log => log.result).join('\n\n'),
          finishReason: stepResult.finishReason
        }
      );
    }

    // Get result and nextState from structured output
    let result: string;
    let nextState: string;

    if (stepResult.structuredOutput) {
      const output = stepResult.structuredOutput as { result: string; nextState: string };
      result = output.result || stepResult.content;
      nextState = output.nextState || '';
    } else {
      // Fallback if structured output is not available
      result = stepResult.content;
      nextState = '';
    }

    // Update context state with nextState for the next step
    context.state = {
      content: nextState,
      usage: stepResult.usage?.totalTokens
    };

    // Create execution log entry (without nextState - it's in context.state now)
    return {
      stepId: step.id,
      result,
      actionResult,
      metadata: {
        usage: stepResult.usage
      }
    };

  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      throw error;
    }
    throw new WorkflowExecutionError(error as Error, stepContext, {
      phase: 'execution',
      partialResult: executionLog.map(log => log.result).join('\n\n')
    });
  }
}

/**
 * Execute execution phase
 */
async function executeExecutionPhase(
  driver: AIDriver,
  module: PromptModule<AgentWorkflowContext>,
  context: AgentWorkflowContext,
  plan: AgentPlan,
  actions: Record<string, ActionHandler>
): Promise<AgentExecutionLog[]> {
  const executionLog = context.executionLog || [];

  // Determine starting position (for resumption)
  const startIndex = executionLog.length;

  // Execute each step
  for (let i = startIndex; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const logEntry = await executeStep(driver, module, context, step, actions, executionLog);
    executionLog.push(logEntry);
  }

  return executionLog;
}

/**
 * Execute integration phase
 */
async function executeIntegrationPhase(
  driver: AIDriver,
  module: PromptModule<AgentWorkflowContext>,
  context: AgentWorkflowContext,
  executionLog: AgentExecutionLog[]
): Promise<string> {
  const integrationModule = merge(agentic, integration, module);
  const finalPrompt = compile(integrationModule, context);

  try {
    const integrationResult = await driver.query(finalPrompt);

    // Check finish reason
    if (integrationResult.finishReason && integrationResult.finishReason !== 'stop') {
      throw new WorkflowExecutionError(
        `Integration failed with reason: ${integrationResult.finishReason}`,
        context,
        {
          phase: 'integration',
          partialResult: executionLog.map(log => log.result).join('\n\n'),
          finishReason: integrationResult.finishReason
        }
      );
    }

    return integrationResult.content;

  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      throw error;
    }
    throw new WorkflowExecutionError(error as Error, context, {
      phase: 'integration',
      partialResult: executionLog.map(log => log.result).join('\n\n')
    });
  }
}

/**
 * Agent workflow - autonomous multi-step processing with planning
 *
 * Flow:
 * 1. Planning phase: Generate execution plan using structured outputs
 * 2. Execution phase: Execute each step (with optional actions)
 * 3. Integration phase: Integrate results and generate final output
 */
export async function agentProcess(
  driver: AIDriver,
  module: PromptModule<AgentWorkflowContext>,
  context: AgentWorkflowContext,
  options: AgentWorkflowOptions = {}
): Promise<WorkflowResult<AgentWorkflowContext>> {

  const {
    maxSteps = 5,
    actions = {},
    enablePlanning = true
  } = options;

  let currentContext = { ...context };
  let plan: AgentPlan;

  // Phase 1: Planning
  if (enablePlanning && !currentContext.plan) {
    currentContext.phase = 'planning';
    plan = await executePlanningPhase(driver, module, currentContext, maxSteps);
    currentContext.plan = plan;
  } else {
    // Use existing plan
    plan = currentContext.plan!;
  }

  // Phase 2: Execution
  currentContext.phase = 'execution';
  const executionLog = await executeExecutionPhase(driver, module, currentContext, plan, actions);
  currentContext.executionLog = executionLog;

  // Phase 3: Integration
  currentContext.phase = 'integration';
  const finalOutput = await executeIntegrationPhase(driver, module, currentContext, executionLog);

  // Complete
  const finalContext: AgentWorkflowContext = {
    ...currentContext,
    phase: 'complete'
  };

  return {
    output: finalOutput,
    context: finalContext,
    metadata: {
      planSteps: plan.steps.length,
      executedSteps: executionLog.length,
      actionsUsed: executionLog.filter(log => log.actionResult !== undefined).length
    }
  };
}
