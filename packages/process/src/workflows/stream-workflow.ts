import { compile } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { WorkflowExecutionError, type AIDriver, type WorkflowResult } from './types.js';
import type { StreamProcessingContext } from '../modules/stream-processing.js';

/**
 * Options for stream workflow
 */
export interface StreamWorkflowOptions {
  tokenLimit?: number;
  maxChunk?: number;
  targetTokens?: number;
}

/**
 * Get next range of chunks to process
 */
function getNextRange(
  chunks: StreamProcessingContext['chunks'],
  currentRange?: { start?: number; end?: number },
  options?: { tokenLimit?: number; maxChunk?: number }
): { start: number; end: number } | undefined {
  const {
    tokenLimit = 128000,
    maxChunk = 100,
  } = options || {};

  if (!chunks || chunks.length === 0) {
    return undefined;
  }

  const range = { ...currentRange };

  if (range.end === undefined) {
    range.end = 0;
  } else {
    range.start = range.end;
  }
  if (range.start === undefined) {
    range.start = range.end;
  }

  let tokens = 0;
  for (let i = range.start; i < chunks.length; i++) {
    tokens += chunks[i].usage || 0;
    range.end = i + 1;

    if (tokens > tokenLimit || range.end - range.start > maxChunk) {
      break;
    }
  }

  if (range.start >= range.end) {
    return undefined; // done
  }

  return range as { start: number; end: number };
}

/**
 * Stream processing workflow - processes chunks sequentially with state accumulation
 * Each iteration processes a range of chunks and updates the state
 */
export async function streamProcess(
  driver: AIDriver,
  module: PromptModule<StreamProcessingContext>,
  context: StreamProcessingContext,
  options: StreamWorkflowOptions = {}
): Promise<WorkflowResult<StreamProcessingContext>> {
  
  const {
    tokenLimit,
    maxChunk,
    targetTokens
  } = options;

  if (!context.chunks || context.chunks.length === 0) {
    throw new Error('No chunks provided for stream processing');
  }

  // Initialize or use existing state
  let state: StreamProcessingContext['state'] = context.state || {
    content: '',
    usage: 0
  };

  // Calculate initial range
  let range = getNextRange(context.chunks, context.range, { tokenLimit, maxChunk });
  
  while (range) {
    const iterationContext: StreamProcessingContext = {
      ...context,
      state,
      range,
      targetTokens
    };

    const prompt = compile(module, iterationContext);
    
    let nextState: string;
    try {
      nextState = await driver.query(prompt);
    } catch (error) {
      // Return error with context that can be used to resume
      throw new WorkflowExecutionError(error as Error, {
        ...context,
        state,
        range
      }, {
        phase: 'stream-iteration',
        partialResult: state.content
      });
    }

    // Update state with the result
    state = {
      content: nextState,
      usage: nextState.length // Simplified token counting
    };

    range = getNextRange(context.chunks, range, { tokenLimit, maxChunk });
  }

  const finalContext: StreamProcessingContext = {
    ...context,
    state,
    range: undefined // Processing complete
  };

  return {
    output: state.content,
    context: finalContext,
    metadata: {
      finalLength: state.content.length,
      targetTokens
    }
  };
}