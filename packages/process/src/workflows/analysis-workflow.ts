import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { streamProcessing } from '../modules/stream-processing.js';
import { analyzeForSummary } from '../modules/summarize.js';
import type { StreamProcessingContext } from '../modules/stream-processing.js';
import { ModuleWorkflow, type AIDriver, type WorkflowResult } from './types.js';

/**
 * Analysis types
 */
export type AnalysisType = 'structure' | 'content' | 'quality' | 'comprehensive';

/**
 * Analysis context
 */
export interface AnalysisContext extends StreamProcessingContext {
  content?: string;
  analysisType?: AnalysisType;
  criteria?: string[];
  currentAnalysis?: string;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  type: AnalysisType;
  depth?: 'shallow' | 'deep';
  criteria?: string[];
  chunkSize?: number;
}

/**
 * Analysis workflow implementation
 */
export class AnalysisWorkflow extends ModuleWorkflow<AnalysisContext, AnalysisOptions> {
  
  constructor(baseModule?: PromptModule<AnalysisContext>) {
    super(baseModule || createAnalysisModule());
  }

  /**
   * Split content into chunks for analysis
   */
  private prepareChunks(content: string, chunkSize: number): Array<{ content: string; partOf: string }> {
    const lines = content.split('\n');
    const chunks: Array<{ content: string; partOf: string }> = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkContent = lines.slice(i, i + chunkSize).join('\n');
      chunks.push({
        content: chunkContent,
        partOf: `section-${Math.floor(i / chunkSize) + 1}`
      });
    }
    
    return chunks;
  }

  async execute(
    driver: AIDriver,
    context: AnalysisContext,
    options: AnalysisOptions
  ): Promise<WorkflowResult<AnalysisContext>> {
    
    const { 
      type, 
      depth = 'shallow',
      criteria = [],
      chunkSize = 100  // lines per chunk
    } = options;
    
    try {
      // Prepare context
      let currentContext: AnalysisContext = {
        ...context,
        analysisType: type,
        criteria
      };
      
      // Prepare content for analysis
      if (!currentContext.chunks && currentContext.content) {
        const chunks = this.prepareChunks(currentContext.content, chunkSize);
        currentContext.chunks = chunks;
      }
      
      if (!currentContext.chunks || currentContext.chunks.length === 0) {
        throw new Error('No content to analyze');
      }
      
      // Create analysis module based on type
      const analysisModule = this.createAnalysisModule(type, criteria);
      
      if (depth === 'shallow' || currentContext.chunks.length <= 3) {
        // Single-pass analysis
        const prompt = compile(analysisModule, currentContext);
        const analysis = await driver.query(prompt);
        
        const finalContext: AnalysisContext = {
          ...currentContext,
          currentAnalysis: analysis
        };
        
        return {
          output: analysis,
          context: finalContext,
          metadata: {
            analysisType: type,
            depth,
            chunksAnalyzed: currentContext.chunks.length
          }
        };
      } else {
        // Deep analysis with streaming
        const streamModule = merge(streamProcessing, analysisModule);
        let analysisState = '';
        const iterations: number[] = [];
        
        // Process in batches
        const batchSize = 3;
        for (let i = 0; i < currentContext.chunks.length; i += batchSize) {
          const batchContext: AnalysisContext = {
            ...currentContext,
            state: { 
              content: analysisState, 
              usage: analysisState.length 
            },
            range: { 
              start: i, 
              end: Math.min(i + batchSize, currentContext.chunks.length) 
            }
          };
          
          const prompt = compile(streamModule, batchContext);
          analysisState = await driver.query(prompt);
          iterations.push(i);
        }
        
        const finalContext: AnalysisContext = {
          ...currentContext,
          currentAnalysis: analysisState,
          state: {
            content: analysisState,
            usage: analysisState.length
          }
        };
        
        return {
          output: analysisState,
          context: finalContext,
          metadata: {
            analysisType: type,
            depth,
            iterations: iterations.length,
            chunksAnalyzed: currentContext.chunks.length
          }
        };
      }
      
    } catch (error) {
      const workflowError = error as any;
      workflowError.context = context;
      throw workflowError;
    }
  }

  /**
   * Create analysis module based on type
   */
  private createAnalysisModule(type: AnalysisType, criteria: string[]): PromptModule<AnalysisContext> {
    const baseInstructions = [
      'Analyze the provided content systematically',
      'Focus on extracting meaningful insights',
      'Maintain objectivity in the analysis'
    ];
    
    const typeSpecificInstructions: Record<AnalysisType, string[]> = {
      structure: [
        'Identify the overall structure and organization',
        'Map out the hierarchy and relationships',
        'Note patterns in the structure'
      ],
      content: [
        'Examine the substance and meaning',
        'Identify key themes and concepts',
        'Evaluate the quality of arguments or data'
      ],
      quality: [
        'Assess completeness and accuracy',
        'Identify strengths and weaknesses',
        'Suggest improvements where applicable'
      ],
      comprehensive: [
        'Perform structural analysis',
        'Analyze content thoroughly',
        'Assess overall quality',
        'Provide synthesis and recommendations'
      ]
    };
    
    return {
      objective: [
        `Perform ${type} analysis on the provided content`
      ],
      
      instructions: [
        ...baseInstructions,
        ...typeSpecificInstructions[type],
        ...(criteria.length > 0 ? [
          'Apply the following specific criteria:',
          ...criteria.map(c => `- ${c}`)
        ] : [])
      ],
      
      cue: [
        'Provide a detailed analysis report:'
      ]
    };
  }

  /**
   * Convenience method to analyze content
   */
  async analyze(
    driver: AIDriver,
    content: string,
    options: AnalysisOptions
  ): Promise<WorkflowResult<AnalysisContext>> {
    const context: AnalysisContext = { content };
    return this.execute(driver, context, options);
  }
}

/**
 * Default analysis module
 */
function createAnalysisModule(): PromptModule<AnalysisContext> {
  return merge(analyzeForSummary, {
    objective: [
      'Perform comprehensive analysis of the provided content'
    ]
  });
}