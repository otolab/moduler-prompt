import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { WorkflowExecutionError } from '../types.js';
import type { AIDriver, WorkflowResult } from '../types.js';
import type { AgenticWorkflowContext, AgenticWorkflowOptions, AgenticPlan, AgenticExecutionLog, ActionHandler } from './types.js';
import { agentic } from './modules/agentic.js';
import { planning } from './modules/planning.js';
import { execution } from './modules/execution.js';
import { integration } from './modules/integration.js';

/**
 * Execute planning phase
 */
async function executePlanningPhase(
  driver: AIDriver,
  module: PromptModule<AgenticWorkflowContext>,
  context: AgenticWorkflowContext,
  maxSteps: number,
  logger?: any
): Promise<AgenticPlan> {
  const planningModule = merge(agentic, planning, module);
  const prompt = compile(planningModule, context);

  try {
    const planResult = await driver.query(prompt);

    logger?.debug('Planning phase - AI generated:', planResult.content);

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

    const plan = planResult.structuredOutput as AgenticPlan;

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
  module: PromptModule<AgenticWorkflowContext>,
  context: AgenticWorkflowContext,
  step: AgenticPlan['steps'][number],
  actions: Record<string, ActionHandler>,
  executionLog: AgenticExecutionLog[],
  logger?: any
): Promise<AgenticExecutionLog> {
  // Execute actions if specified
  let actionResult: any;
  if (step.actions && step.actions.length > 0) {
    for (const action of step.actions) {
      if (actions[action.tool]) {
        try {
          actionResult = await actions[action.tool](action.params, context);
        } catch (error) {
          throw new WorkflowExecutionError(
            `Tool '${action.tool}' failed: ${(error as Error).message}`,
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
    }
  }

  // Execute step with AI
  const executionModule = merge(agentic, execution, module);
  const stepContext: AgenticWorkflowContext = {
    ...context,
    currentStep: step,
    actionResult,
    executionLog
  };

  const prompt = compile(executionModule, stepContext);

  try {
    const stepResult = await driver.query(prompt);

    logger?.debug(`Execution step ${step.id} - AI generated:`, stepResult.content);

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
  module: PromptModule<AgenticWorkflowContext>,
  context: AgenticWorkflowContext,
  plan: AgenticPlan,
  actions: Record<string, ActionHandler>,
  logger?: any
): Promise<AgenticExecutionLog[]> {
  const executionLog = context.executionLog || [];

  // Determine starting position (for resumption)
  const startIndex = executionLog.length;

  // Execute each step
  for (let i = startIndex; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const logEntry = await executeStep(driver, module, context, step, actions, executionLog, logger);
    executionLog.push(logEntry);
  }

  return executionLog;
}

/**
 * Execute integration phase
 */
async function executeIntegrationPhase(
  driver: AIDriver,
  module: PromptModule<AgenticWorkflowContext>,
  context: AgenticWorkflowContext,
  executionLog: AgenticExecutionLog[],
  logger?: any
): Promise<string> {
  const integrationModule = merge(agentic, integration, module);
  const finalPrompt = compile(integrationModule, context);

  try {
    const integrationResult = await driver.query(finalPrompt);

    logger?.debug('Integration phase - AI generated:', integrationResult.content);

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
 * Agentic workflow - autonomous multi-step processing with planning
 *
 * Flow:
 * 1. Planning phase: Generate execution plan using structured outputs
 * 2. Execution phase: Execute each step (with optional actions)
 * 3. Integration phase: Integrate results and generate final output
 */
export async function agenticProcess(
  driver: AIDriver,
  module: PromptModule<AgenticWorkflowContext>,
  context: AgenticWorkflowContext,
  options: AgenticWorkflowOptions = {}
): Promise<WorkflowResult<AgenticWorkflowContext>> {

  const {
    maxSteps = 5,
    actions = {},
    enablePlanning = true,
    logger
  } = options;

  let currentContext = { ...context };
  let plan: AgenticPlan;

  // Phase 1: Planning
  if (enablePlanning && !currentContext.plan) {
    currentContext.phase = 'planning';
    plan = await executePlanningPhase(driver, module, currentContext, maxSteps, logger);
    currentContext.plan = plan;
  } else {
    // Use existing plan
    plan = currentContext.plan!;
  }

  // Phase 2: Execution
  currentContext.phase = 'execution';
  const executionLog = await executeExecutionPhase(driver, module, currentContext, plan, actions, logger);
  currentContext.executionLog = executionLog;

  // Phase 3: Integration
  currentContext.phase = 'integration';
  const finalOutput = await executeIntegrationPhase(driver, module, currentContext, executionLog, logger);

  // Complete
  const finalContext: AgenticWorkflowContext = {
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
