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
import { ModuleWorkflow, type AIDriver, type WorkflowResult } from './types.js';

/**
 * Extended dialogue context with materials
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
 * Dialogue workflow implementation
 */
export class DialogueWorkflow extends ModuleWorkflow<DialogueWorkflowContext, DialogueWorkflowOptions> {
  
  constructor(baseModule?: PromptModule<DialogueWorkflowContext>) {
    super(baseModule || dialogueBase);
  }

  async execute(
    driver: AIDriver,
    context: DialogueWorkflowContext,
    options: DialogueWorkflowOptions = {}
  ): Promise<WorkflowResult<DialogueWorkflowContext>> {
    
    const { twoPass = false, maintainState = false, includematerials = false } = options;
    
    try {
      // Build the module based on options
      let workflowModule = this.module;
      
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
        const preparationNote = await driver.query(firstPassPrompt);
        
        // Update context with preparation note
        const updatedContext: DialogueWorkflowContext = {
          ...context,
          preparationNote: { content: preparationNote }
        };
        
        // Second pass: Generate actual response
        const secondPassModule = merge(workflowModule, secondOfTwoPassResponse);
        const secondPassPrompt = compile(secondPassModule, updatedContext);
        const response = await driver.query(secondPassPrompt);
        
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
        const response = await driver.query(prompt);
        
        // Update context
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
    } catch (error) {
      // Return error with recoverable context
      const workflowError = error as any;
      workflowError.context = context;
      throw workflowError;
    }
  }

  /**
   * Convenience method to add a user message and get response
   */
  async respond(
    driver: AIDriver,
    message: string,
    context: DialogueWorkflowContext = { messages: [] },
    options?: DialogueWorkflowOptions
  ): Promise<WorkflowResult<DialogueWorkflowContext>> {
    // Add user message to context
    const updatedContext: DialogueWorkflowContext = {
      ...context,
      messages: [
        ...(context.messages || []),
        { role: 'user', content: message }
      ]
    };
    
    return this.execute(driver, updatedContext, options);
  }
}