import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { WorkflowExecutionError } from '../types.js';
import type { AIDriver, WorkflowResult } from '../types.js';
import type {
  SelfPromptingWorkflowContext,
  SelfPromptingWorkflowOptions,
  SelfPromptingPlan,
  SelfPromptingStep,
  SelfPromptingExecutionLog,
  ActionHandler
} from './types.js';
import { planning } from './modules/planning.js';
import { integration } from './modules/integration.js';

/**
 * Base module for self-prompting workflow
 */
const baseSelfPromptingModule: PromptModule<SelfPromptingWorkflowContext> = {
  methodology: [
    '- Self-prompting workflow executes work through Planning → Execution → Integration.',
    '- Planning generates complete prompts (instructions + data) for each step.',
    '- Execution uses generated prompts directly without further compilation.'
  ],
  state: [
    (ctx) => ctx.phase ? `Current phase: ${ctx.phase}` : null
  ]
};

/**
 * Execute planning phase to generate execution plan with complete prompts
 */
async function executePlanningPhase(
  driver: AIDriver,
  module: PromptModule<SelfPromptingWorkflowContext>,
  context: SelfPromptingWorkflowContext,
  maxSteps: number
): Promise<SelfPromptingPlan> {
  const planningPrompt = compile(merge(baseSelfPromptingModule, planning, module), context);

  try {
    const planResult = await driver.query(planningPrompt);

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

    const plan = planResult.structuredOutput as SelfPromptingPlan;
    if (!plan.steps || !Array.isArray(plan.steps)) {
      throw new WorkflowExecutionError(
        'Plan must contain steps array',
        context,
        {
          phase: 'planning'
        }
      );
    }

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
 * Execute a single step using generated prompt
 */
async function executeStep(
  driver: AIDriver,
  module: PromptModule<SelfPromptingWorkflowContext>,
  context: SelfPromptingWorkflowContext,
  step: SelfPromptingStep,
  actions: Record<string, ActionHandler>
): Promise<SelfPromptingExecutionLog> {
  let actionResult: any;

  // Execute actions if specified
  if (step.actions) {
    for (const action of step.actions) {
      const handler = actions[action.tool];
      if (!handler) {
        throw new WorkflowExecutionError(
          `Action "${action.tool}" is not available`,
          context,
          { phase: 'execution' }
        );
      }

      try {
        actionResult = await handler(action.params ?? {}, context);
      } catch (error) {
        throw new WorkflowExecutionError(
          error as Error,
          context,
          {
            phase: 'execution',
            partialResult: `Action ${action.tool} failed`
          }
        );
      }
    }
  }

  // Build prompt directly from generated prompt (bypass moduler-prompt compilation)
  const executionPrompt = {
    instructions: step.prompt.instructions.map(text => ({
      type: 'text' as const,
      content: text
    })),
    data: step.prompt.data.map(text => ({
      type: 'text' as const,
      content: text
    })),
    output: [
      {
        type: 'text' as const,
        content: 'Output a JSON object containing the execution result of the current step.'
      }
    ],
    metadata: {
      outputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'string',
            description: 'Execution result: Describe what was done in this step and what results were obtained.'
          },
          nextState: {
            type: 'string',
            description: 'Handover note for the next step (simple text, not object/array)'
          }
        },
        required: ['result', 'nextState']
      }
    }
  };

  try {
    const result = await driver.query(executionPrompt);

    if (result.finishReason && result.finishReason !== 'stop') {
      throw new WorkflowExecutionError(
        `Execution failed with reason: ${result.finishReason}`,
        context,
        {
          phase: 'execution',
          partialResult: result.content,
          finishReason: result.finishReason
        }
      );
    }

    // Extract result from structured output or content
    let executionResult: string;
    let nextState: string | undefined;

    if (result.structuredOutput) {
      const output = result.structuredOutput as { result?: string; nextState?: string };
      executionResult = output.result || result.content;
      nextState = output.nextState;
    } else {
      executionResult = result.content;
    }

    return {
      stepId: step.id,
      result: executionResult,
      actionResult,
      metadata: {
        usage: result.usage,
        nextState
      }
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      throw error;
    }
    throw new WorkflowExecutionError(error as Error, context, {
      phase: 'execution'
    });
  }
}

/**
 * Execute all steps in the execution plan
 */
async function executeExecutionPhase(
  driver: AIDriver,
  module: PromptModule<SelfPromptingWorkflowContext>,
  context: SelfPromptingWorkflowContext,
  plan: SelfPromptingPlan,
  actions: Record<string, ActionHandler>
): Promise<SelfPromptingExecutionLog[]> {
  const executionLog = context.executionLog ? [...context.executionLog] : [];
  const startIndex = executionLog.length;

  for (let i = startIndex; i < plan.steps.length; i++) {
    const currentStep = plan.steps[i];
    const logEntry = await executeStep(driver, module, context, currentStep, actions);
    executionLog.push(logEntry);
    context.executionLog = executionLog;

    // Update state from execution result
    if (logEntry.metadata?.nextState) {
      context.state = {
        content: logEntry.metadata.nextState,
        usage: logEntry.metadata.usage
      };
    }
  }

  return executionLog;
}

/**
 * Execute integration phase to combine all results
 */
async function executeIntegrationPhase(
  driver: AIDriver,
  module: PromptModule<SelfPromptingWorkflowContext>,
  context: SelfPromptingWorkflowContext
): Promise<string> {
  const integrationPrompt = compile(merge(baseSelfPromptingModule, integration, module), context);

  try {
    const result = await driver.query(integrationPrompt);

    if (result.finishReason && result.finishReason !== 'stop') {
      throw new WorkflowExecutionError(
        `Integration failed with reason: ${result.finishReason}`,
        context,
        {
          phase: 'integration',
          partialResult: result.content,
          finishReason: result.finishReason
        }
      );
    }

    return result.content;
  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      throw error;
    }

    throw new WorkflowExecutionError(error as Error, context, {
      phase: 'integration'
    });
  }
}

/**
 * Self-prompting workflow - AI generates complete prompts for each step
 *
 * @param driver - AI driver for executing prompts
 * @param module - User's prompt module (merged with phase modules internally)
 * @param context - Workflow context
 * @param options - Workflow options
 * @returns Workflow result with final output and updated context
 */
export async function selfPromptingProcess(
  driver: AIDriver,
  module: PromptModule<SelfPromptingWorkflowContext>,
  context: SelfPromptingWorkflowContext,
  options: SelfPromptingWorkflowOptions = {}
): Promise<WorkflowResult<SelfPromptingWorkflowContext>> {
  const {
    maxSteps = 5,
    actions = {},
    enablePlanning = true,
    logger
  } = options;

  let currentContext: SelfPromptingWorkflowContext = { ...context };
  let plan: SelfPromptingPlan | undefined = currentContext.plan;

  // Planning phase
  if (enablePlanning || !plan) {
    if (logger) {
      logger.info('Starting planning phase');
    }
    currentContext.phase = 'planning';
    plan = await executePlanningPhase(driver, module, currentContext, maxSteps);
    currentContext.plan = plan;
    if (logger) {
      logger.info(`Planning completed: ${plan.steps.length} steps`);
    }
  }

  if (!plan) {
    throw new WorkflowExecutionError(
      'Self-prompting workflow requires a plan to execute',
      currentContext,
      { phase: 'planning' }
    );
  }

  // Execution phase
  if (logger) {
    logger.info('Starting execution phase');
  }
  currentContext.phase = 'execution';
  const executionLog = await executeExecutionPhase(driver, module, currentContext, plan, actions);
  currentContext.executionLog = executionLog;
  if (logger) {
    logger.info(`Execution completed: ${executionLog.length} steps`);
  }

  // Integration phase
  if (logger) {
    logger.info('Starting integration phase');
  }
  currentContext.phase = 'integration';
  const finalOutput = await executeIntegrationPhase(driver, module, currentContext);
  if (logger) {
    logger.info('Integration completed');
  }

  const finalContext: SelfPromptingWorkflowContext = {
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
