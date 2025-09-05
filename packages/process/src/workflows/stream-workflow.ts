import { merge, compile } from '@moduler-prompt/core';
import type { PromptModule, CompiledPrompt } from '@moduler-prompt/core';
import { streamProcessing } from '../modules/stream-processing.js';
import type { StreamProcessingContext } from '../modules/stream-processing.js';

/**
 * Stream workflow configuration
 */
export interface StreamWorkflowConfig {
  /** Base algorithm module for processing */
  algorithm: PromptModule<any>;
  /** Whether to enable size control */
  sizeControl?: boolean;
  /** Target token size for size control */
  targetTokens?: number;
}

/**
 * Stream workflow context
 */
export interface StreamWorkflowContext extends StreamProcessingContext {
  iteration?: number;
  totalIterations?: number;
}

/**
 * Creates a stream processing workflow
 */
export function createStreamWorkflow(config: StreamWorkflowConfig): PromptModule<StreamWorkflowContext> {
  // Base stream processing module already handles size control dynamically
  const baseModule = streamProcessing;
  
  // Merge base stream processing with the algorithm
  const workflowModule = merge(baseModule, config.algorithm);
  
  // Add workflow-specific enhancements
  const enhancedModule: PromptModule<StreamWorkflowContext> = {
    ...workflowModule,
    
    objective: [
      ...(workflowModule.objective || []),
      (context) => {
        if (context.iteration && context.totalIterations) {
          return {
            type: 'text',
            content: `This is iteration ${context.iteration} of ${context.totalIterations} in the stream processing workflow.`
          };
        }
        return null;
      }
    ],
    
    createContext: () => ({
      targetTokens: config.targetTokens,
      ...workflowModule.createContext?.()
    })
  };
  
  return enhancedModule;
}

/**
 * Executes a single iteration of stream processing
 */
export async function executeStreamIteration(
  workflow: PromptModule<StreamWorkflowContext>,
  context: StreamWorkflowContext
): Promise<CompiledPrompt> {
  return compile(workflow, context);
}

/**
 * Stream processing runner
 */
export class StreamProcessor<TContext extends StreamWorkflowContext = StreamWorkflowContext> {
  private workflow: PromptModule<TContext>;
  private currentState: string = '';
  private iteration: number = 0;
  
  constructor(workflow: PromptModule<TContext>) {
    this.workflow = workflow;
  }
  
  /**
   * Process a batch of chunks
   */
  async processBatch(
    chunks: TContext['chunks'],
    context?: Partial<TContext>
  ): Promise<CompiledPrompt> {
    this.iteration++;
    
    const fullContext: TContext = {
      chunks,
      state: {
        content: this.currentState,
        usage: this.currentState.length // Simplified token counting
      },
      iteration: this.iteration,
      ...context
    } as TContext;
    
    const result = await executeStreamIteration(this.workflow as unknown as PromptModule<StreamWorkflowContext>, fullContext as unknown as StreamWorkflowContext);
    
    // Extract the next state from the result
    // This would typically be parsed from the AI response
    // For now, we return the compiled prompt
    return result;
  }
  
  /**
   * Update the current state
   */
  updateState(newState: string): void {
    this.currentState = newState;
  }
  
  /**
   * Get the current state
   */
  getState(): string {
    return this.currentState;
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.currentState = '';
    this.iteration = 0;
  }
}