import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { streamProcessing } from '../modules/stream-processing.js';
import { summarizeBase, analyzeForSummary, contentSummarize } from '../modules/summarize.js';
import type { StreamProcessingContext } from '../modules/stream-processing.js';
import type { SummarizeContext } from '../modules/summarize.js';
import { ModuleWorkflow, type AIDriver, type WorkflowResult } from './types.js';

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
  chunkSize?: number;
  enableAnalysis?: boolean;
}

/**
 * Summarization workflow implementation
 */
export class SummarizeWorkflow extends ModuleWorkflow<SummarizeWorkflowContext, SummarizeWorkflowOptions> {
  
  constructor(baseModule?: PromptModule<SummarizeWorkflowContext>) {
    super(baseModule || summarizeBase);
  }

  /**
   * Split text into chunks
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }

  async execute(
    driver: AIDriver,
    context: SummarizeWorkflowContext,
    options: SummarizeWorkflowOptions
  ): Promise<WorkflowResult<SummarizeWorkflowContext>> {
    
    const { 
      targetTokens,
      chunkSize = 500,  // words per chunk
      enableAnalysis = true 
    } = options;
    
    try {
      let currentContext = { ...context };
      let analysisReport = '';
      
      // Prepare chunks if not provided
      if (!currentContext.chunks && currentContext.state?.content) {
        const text = currentContext.state.content;
        const textChunks = this.splitIntoChunks(text, chunkSize);
        currentContext.chunks = textChunks.map((content, index) => ({
          content,
          partOf: 'source',
          usage: content.length
        }));
      }
      
      if (!currentContext.chunks || currentContext.chunks.length === 0) {
        throw new Error('No content to summarize');
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
          analysisState = await driver.query(prompt);
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
        summaryState = await driver.query(prompt);
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
      
    } catch (error) {
      // Return error with recoverable context
      const workflowError = error as any;
      workflowError.context = context;
      throw workflowError;
    }
  }

  /**
   * Convenience method to summarize text
   */
  async summarize(
    driver: AIDriver,
    text: string,
    options: SummarizeWorkflowOptions
  ): Promise<WorkflowResult<SummarizeWorkflowContext>> {
    const context: SummarizeWorkflowContext = {
      state: { content: text, usage: text.length }
    };
    
    return this.execute(driver, context, options);
  }
}