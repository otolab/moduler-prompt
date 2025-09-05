import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { streamProcessing } from '../modules/stream-processing.js';
import { summarizeBase, analyzeForSummary, contentSummarize } from '../modules/summarize.js';
import type { StreamProcessingContext } from '../modules/stream-processing.js';
import type { SummarizeContext } from '../modules/summarize.js';
import { ModuleWorkflow, WorkflowExecutionError, type AIDriver, type WorkflowResult } from './types.js';

/**
 * Combined context for summarization workflow
 */
export interface SummarizeWorkflowContext {
  state?: {
    content: string;
    usage?: number;
  };
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    attachments?: any[];
  }>;
  preparationNote?: {
    content: string;
  };
  targetTokens?: number;
  range?: {
    start: number;
    end: number;
  };
  analysisReport?: string;
  phase?: 'analysis' | 'summarization' | 'complete';
}

/**
 * Options for summarization workflow
 */
export interface SummarizeWorkflowOptions {
  targetTokens: number;
  enableAnalysis?: boolean;
}

/**
 * Summarization workflow implementation
 */
export class SummarizeWorkflow extends ModuleWorkflow<SummarizeWorkflowContext, SummarizeWorkflowOptions> {
  
  constructor(baseModule?: PromptModule<SummarizeWorkflowContext>) {
    super(baseModule || summarizeBase);
  }


  async execute(
    driver: AIDriver,
    context: SummarizeWorkflowContext,
    options: SummarizeWorkflowOptions
  ): Promise<WorkflowResult<SummarizeWorkflowContext>> {
    
    const { 
      targetTokens,
      enableAnalysis = true 
    } = options;
    
    let currentContext = { ...context };
    let analysisReport = '';
    
    // Require chunks to be provided by caller
    if (!currentContext.chunks || currentContext.chunks.length === 0) {
      throw new Error('No chunks provided. Chunks must be prepared before calling the workflow.');
    }
    
    // Phase 1: Analysis (optional)
    if (enableAnalysis) {
      currentContext.phase = 'analysis';
      const analysisModule = merge(streamProcessing, analyzeForSummary);
      
      // Process chunks for analysis
      let analysisState = '';
      for (let i = 0; i < currentContext.chunks.length; i += 3) {
        const batchContext: SummarizeWorkflowContext = {
          ...currentContext,
          state: { content: analysisState, usage: analysisState.length },
          range: { start: i, end: Math.min(i + 3, currentContext.chunks.length) }
        };
        
        const prompt = compile(analysisModule, batchContext);
        
        try {
          analysisState = await driver.query(prompt);
        } catch (error) {
          // Preserve context and phase info on driver error
          throw new WorkflowExecutionError(error as Error, batchContext, {
            phase: 'analysis',
            iteration: i
          });
        }
      }
      
      analysisReport = analysisState;
      currentContext.preparationNote = { content: analysisReport };
    }
    
    // Phase 2: Summarization
    currentContext.phase = 'summarization';
    const summarizeModule = merge(
      streamProcessing,
      contentSummarize,
      this.module
    );
    
    // Process chunks for summarization
    let summaryState = '';
    const iterations: number[] = [];
    
    for (let i = 0; i < currentContext.chunks.length; i += 3) {
      const batchContext: SummarizeWorkflowContext = {
        ...currentContext,
        state: { 
          content: summaryState, 
          usage: summaryState.length 
        },
        range: { 
          start: i, 
          end: Math.min(i + 3, currentContext.chunks.length) 
        },
        targetTokens,
        preparationNote: currentContext.preparationNote
      };
      
      const prompt = compile(summarizeModule, batchContext);
      
      try {
        summaryState = await driver.query(prompt);
      } catch (error) {
        // Preserve context and phase info on driver error
        throw new WorkflowExecutionError(error as Error, batchContext, {
          phase: 'summarization',
          iteration: i
        });
      }
      
      iterations.push(i);
      
      // Check if we're approaching target size
      if (summaryState.length > targetTokens * 4) {  // Rough char to token estimate
        // Aggressive reduction needed
        batchContext.state = {
          content: summaryState,
          usage: summaryState.length
        };
      }
    }
    
    // Final context
    const finalContext: SummarizeWorkflowContext = {
      ...currentContext,
      phase: 'complete',
      state: {
        content: summaryState,
        usage: summaryState.length
      },
      analysisReport
    };
    
    return {
      output: summaryState,
      context: finalContext,
      metadata: {
        iterations: iterations.length,
        analysisEnabled: enableAnalysis,
        finalLength: summaryState.length,
        targetTokens
      }
    };
  }

  /**
   * Convenience method to summarize text with pre-chunked content
   */
  async summarize(
    driver: AIDriver,
    chunks: Array<{ content: string; partOf?: string; usage?: number }>,
    options: SummarizeWorkflowOptions
  ): Promise<WorkflowResult<SummarizeWorkflowContext>> {
    const context: SummarizeWorkflowContext = {
      chunks
    };
    
    return this.execute(driver, context, options);
  }
}