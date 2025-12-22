import type { PromptModule } from '@modular-prompt/core';

/**
 * Stream processing context interface
 */
export interface StreamProcessingContext {
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    attachments?: any[];
  }>;
  state?: {
    content: string;
    usage?: number;
  };
  range?: {
    start?: number;
    end?: number;
  };
  targetTokens?: number;
}

/**
 * Stream processing module - for processing large texts in chunks
 */
export const streamProcessing: PromptModule<StreamProcessingContext> = {
  objective: [
    'The assistant functions as a non-interactive system that processes each iteration of stream processing.',
    'The goal of the overall stream processing is to process the entire Source Text by dividing it into manageable chunks.',
    'In this iteration, perform the specified processing on the Input Chunks and Current State, producing the Next State as output.',
    (context) => {
      // Detect if this is the first or last iteration based on range
      if (!context.chunks || !context.range) return null;
      
      const isFirst = context.range.start === 0 || context.range.start === undefined;
      const isLast = context.range.end === context.chunks.length;
      
      if (isFirst && isLast) {
        return {
          type: 'text',
          content: 'This is a single-iteration processing. Complete all processing in this iteration.'
        };
      } else if (isFirst) {
        return {
          type: 'text',
          content: 'This is the first iteration. Initialize the state with foundational information.'
        };
      } else if (isLast) {
        return {
          type: 'text',
          content: 'This is the final iteration. Ensure the Next State represents the complete processing result.'
        };
      }
      return null;
    }
  ],
  
  terms: [
    'Stream Processing: A process of obtaining the final output by dividing the input data (the Source Text in this system) and performing iterative sequential processing.',
    'Source Text: The text to be processed. It is divided into chunks, and several chunks are provided in each iteration.',
    'Iteration: A unit of processing in stream processing. It is repeated to process time-series data or large segmented processing targets.',
    'Chunk: A part of the source text divided based on chapter structure or text volume.',
    'State: The text data updated in each iteration. The processing result of each iteration is retained.',
    'Current State: The state at the beginning of an iteration, containing results from previous iterations.',
    'Next State: The state produced by the current iteration, which becomes the Current State for the next iteration.'
  ],
  
  methodology: [
    'Read the Current State, which contains the processing results from previous iterations.',
    'Process the provided Input Chunks according to the specified processing logic.',
    'Merge the processing results with the Current State to create the Next State.',
    'Ensure the Next State integrates all information processed so far.',
    'Output only the Next State content without any formatting or metadata.',
    (context) => {
      // Add size control instructions if targetTokens is specified
      if (!context.targetTokens) return null;
      
      const sizePrompt = `Control the Next State size to target ${context.targetTokens} tokens.`;
      
      if (context.state?.usage && context.state.usage > context.targetTokens * 0.8) {
        return {
          type: 'text',
          content: `${sizePrompt} Current size is ${context.state.usage} tokens - aggressively reduce size while preserving key information.`
        };
      }
      
      return {
        type: 'text',
        content: `${sizePrompt} Aim for this target without exceeding it.`
      };
    },
    {
      type: 'subsection',
      title: 'State Management',
      items: [
        'The Current State represents cumulative results from all previous iterations.',
        'Each iteration processes only a portion of the entire Source Text.',
        'The Next State must preserve important information from the Current State.',
        'Merge new information with existing state rather than replacing it.',
        'The final state after all iterations should represent the complete processing result.'
      ]
    }
  ],
  
  instructions: [
    'The Source Text is divided into chunks and processed iteratively.',
    'In each iteration, you receive the Current State (previous results) and new Input Chunks.',
    'Your task is to process the chunks and update the state accordingly.',
    'The output should be the Next State that will serve as input for the next iteration.'
  ],
  
  state: [
    (context) => {
      if (!context.state?.content) return null;
      
      return {
        type: 'chunk' as const,
        content: context.state.content,
        partOf: 'state',
        usage: context.state.usage
      };
    }
  ],
  
  materials: [
    (context) => {
      if (!context.chunks || context.chunks.length === 0) return null;
      
      const chunks = context.chunks.slice(context.range?.start, context.range?.end);
      if (chunks.length === 0) return null;
      
      return chunks.map((chunk, index) => ({
        type: 'chunk' as const,
        content: chunk.content,
        partOf: chunk.partOf || 'input',
        index,
        usage: chunk.usage
      }));
    }
  ],
  
  cue: [
    'Below is the output for the Next State:'
  ],
  
  guidelines: [
    (context) => {
      if (!context.targetTokens) return null;
      
      return {
        type: 'text',
        content: 'If the Target Size limit is likely to be exceeded, boldly discard information without fear of missing information. Simplify the presentation, remove duplicate content, remove non-obvious items.'
      };
    },
    'Source text chunks provided in previous iterations are not accessible in the current iteration, so information extraction and importance review can only be done for a given chunk.'
  ]
};