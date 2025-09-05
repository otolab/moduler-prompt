import { compile, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { 
  dialogueBase, 
  firstOfTwoPassResponse, 
  secondOfTwoPassResponse,
  withTalkState 
} from '../modules/dialogue.js';
import { withMaterials } from '../modules/material.js';
import type { DialogueContext } from '../modules/dialogue.js';
import type { MaterialContext } from '../modules/material.js';
import { WorkflowExecutionError, type AIDriver, type WorkflowResult } from './types.js';

/**
 * Extended dialogue context with materials and preparation note
 */
export interface DialogueWorkflowContext extends DialogueContext, MaterialContext {
  preparationNote?: {
    content: string;
  };
}

/**
 * Options for dialogue workflow
 */
export interface DialogueWorkflowOptions {
  twoPass?: boolean;
  maintainState?: boolean;
  includematerials?: boolean;
}

/**
 * Dialogue workflow - handles conversational interactions with optional two-pass processing
 */
export async function dialogueProcess(
  driver: AIDriver,
  module: PromptModule<DialogueWorkflowContext>,
  context: DialogueWorkflowContext,
  options: DialogueWorkflowOptions = {}
): Promise<WorkflowResult<DialogueWorkflowContext>> {
  
  const { twoPass = false, maintainState = false, includematerials = false } = options;
  
  // Build the module based on options
  let workflowModule = module;
  
  if (maintainState) {
    workflowModule = merge(workflowModule, withTalkState);
  }
  
  if (includematerials && context.materials) {
    workflowModule = merge(workflowModule, withMaterials);
  }
  
  if (twoPass) {
    // First pass: Generate preparation notes
    const firstPassModule = merge(workflowModule, firstOfTwoPassResponse);
    const firstPassPrompt = compile(firstPassModule, context);
    
    let preparationNote: string;
    try {
      preparationNote = await driver.query(firstPassPrompt);
    } catch (error) {
      // Preserve context on driver error for first pass
      throw new WorkflowExecutionError(error as Error, context, {
        phase: 'firstPass',
        partialResult: ''
      });
    }
    
    // Update context with preparation note
    const updatedContext: DialogueWorkflowContext = {
      ...context,
      preparationNote: { content: preparationNote }
    };
    
    // Second pass: Generate actual response
    const secondPassModule = merge(workflowModule, secondOfTwoPassResponse);
    const secondPassPrompt = compile(secondPassModule, updatedContext);
    
    let response: string;
    try {
      response = await driver.query(secondPassPrompt);
    } catch (error) {
      // Preserve updated context (with preparation note) on driver error for second pass
      throw new WorkflowExecutionError(error as Error, updatedContext, {
        phase: 'secondPass',
        partialResult: preparationNote
      });
    }
    
    // Update messages with the response
    const finalContext: DialogueWorkflowContext = {
      ...updatedContext,
      messages: [
        ...(context.messages || []),
        { role: 'assistant', content: response }
      ]
    };
    
    return {
      output: response,
      context: finalContext,
      metadata: {
        twoPass: true,
        preparationNoteLength: preparationNote.length
      }
    };
  } else {
    // Single pass response
    const prompt = compile(workflowModule, context);
    
    let response: string;
    try {
      response = await driver.query(prompt);
    } catch (error) {
      // Preserve context on driver error
      throw new WorkflowExecutionError(error as Error, context, {
        phase: 'singlePass',
        partialResult: ''
      });
    }
    
    // Update context with new message
    const finalContext: DialogueWorkflowContext = {
      ...context,
      messages: [
        ...(context.messages || []),
        { role: 'assistant', content: response }
      ]
    };
    
    return {
      output: response,
      context: finalContext,
      metadata: {
        twoPass: false
      }
    };
  }
}