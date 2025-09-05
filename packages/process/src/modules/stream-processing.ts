import type { PromptModule } from '@moduler-prompt/core';

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
    'The goal of the overall stream processing, including the current iteration, is to generate the results of algorithmic processing on the Source Text.',
    'In this iteration, the instructed processing is performed on the Chunks, which is part of the Current State and the Source Text, and the Next State is output as the processing result up to this point.'
  ],
  
  terms: [
    'Stream Processing: A process of obtaining the final output by dividing the input data (the Source Text in this system) and performing iterative sequential processing.',
    'Algorithm: The procedure executed in each iteration within this system.',
    'Source Text: The text to be processed. It is divided into chunks, and several chunks are provided in each iteration.',
    'Iteration: A unit of processing in stream processing. It is repeated to process time-series data or large segmented processing targets.',
    'Chunk: A part of the source text divided based on chapter structure or text volume.',
    'State: The text data updated in each iteration. The processing result of each iteration is retained.'
  ],
  
  instructions: [
    'The Source Text to be processed is divided and provided as the Chunks in each iteration.',
    'The initial state of the iteration is given as the Current State, which is the result of the previous iteration.',
    'The assistant processes the input chunks based on the algorithm, updates the Current State with the result, and generates the Next State.',
    'The output of this iteration should be the text of the Next State. This state should integrate and include all processing results so far.',
    'The final state after completing all iterations should be equivalent to the processing result for the entire Source Text.',
    'The output text should only include the text that will be the initial state of the next iteration, without including titles, code block declarations, or additional meta descriptions.',
    {
      type: 'subsection',
      title: 'Conflict Resolution',
      content: '',
      items: [
        'The input chunk provided in the current iteration is part of the data being processed, meaning that each iteration only deals with a portion of the entire dataset.',
        'The final state of stream processing must be a comprehensive description of all the data processed, which implies that the output should reflect the cumulative results of all iterations.',
        'By continuously updating the current state, which is the result of the previous iteration, the final state can be treated as the result of all the data processed.',
        'All iterations should be treated equally, and the description content of the current state, which is the result of the previous iteration, should be retained. Merging is recommended to ensure necessary information remains.',
        'Stream processing should be transparent. The conclusion of the output state should be based on the cumulative results of all processed chunks, not just the current iteration.'
      ]
    }
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
  ]
};

/**
 * Stream processing with size control
 */
export const streamProcessingWithSizeControl: PromptModule<StreamProcessingContext> = {
  ...streamProcessing,
  
  instructions: [
    ...streamProcessing.instructions || [],
    (context) => {
      if (!context.targetTokens) return { type: 'text', content: '' };
      
      const sizePrompt = `The Next State, the output of this iteration, should target a size of ${context.targetTokens} tokens. It's desirable to be close to this value, but exceeding it is not allowed.`;
      
      if (context.state?.usage && context.state.usage * 0.8 > context.targetTokens) {
        return {
          type: 'text',
          content: `${sizePrompt} The current size is ${context.state.usage} tokens and should be processed in a way that aggressively reduces its size.`
        };
      }
      
      return {
        type: 'text',
        content: `${sizePrompt} Close to this value is desirable, but must not exceed it.`
      };
    }
  ],
  
  guidelines: [
    'If the Target Size limit is likely to be exceeded, boldly discard information without fear of missing information.',
    'Simplify the presentation, remove duplicate content, remove non-obvious items.',
    'Source text chunks provided in previous iterations are not accessible in the current iteration, so information extraction and importance review can only be done for a given chunk.'
  ]
};