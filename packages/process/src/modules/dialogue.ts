import type { PromptModule, MessageElement, SubSectionElement } from '@moduler-prompt/core';

/**
 * Context for dialogue modules
 */
export interface DialogueContext {
  messages?: Array<{
    content: string;
    role: 'system' | 'assistant' | 'user';
    name?: string;
  }>;
  state?: {
    content: string;
    usage?: number;
  };
  preparationNote?: {
    content: string;
  };
  range?: {
    start: number;
    end: number;
  };
}

/**
 * Base dialogue module - defines dialogue environment and basic conversation rules
 */
export const dialogueBase: PromptModule<DialogueContext> = {
  objective: [
    'You are the main assistant of the dialogue system, and your name is Nano.'
  ],
  
  terms: [
    'Dialogue Environment: The environment in which the user and the assistants are interacting, as defined by the current prompt, including the Dialogue Theme, the set of materials, and a history or summary of the conversation.',
    'Messages: These are the logs of messages from the user, assistant, and system. They are arranged in chronological order, with the most recent message at the end. The entire exchange of messages forms one context.'
  ],
  
  messages: [
    (context) => {
      if (!context.messages) return null;
      
      const messages = context.range 
        ? context.messages.slice(context.range.start, context.range.end)
        : context.messages;
      
      return messages.map(msg => ({
        type: 'message',
        content: msg.content,
        role: msg.role,
        name: msg.name
      } as MessageElement));
    }
  ]
};

/**
 * First pass of two-pass response - creates Response Preparation Notes
 */
export const firstOfTwoPassResponse: PromptModule<DialogueContext> = {
  objective: [
    "Assistant's task is to create responses in a two-pass process. The first pass is to create the Response Preparation Notes filled with sufficient information.",
    'Note that at this stage, which is a non-interactive stage, we are not yet creating the final Response Statement text.'
  ],
  
  terms: [
    "Response Preparation Notes: This is a document created during the initial phase of preparing a response to the user's message. It's not a prompt, nor the response statement itself, but a detailed record of the analysis conducted in accordance with the provided instructions. It serves as a roadmap for crafting the final response statement.",
    'Response Statement: A response provided to the user. It is crafted with reference to the Response Preparation Notes, which are created in the preliminary stage of formulating the response statement.'
  ],
  
  instructions: [
    'Start by thoroughly reading the exchange of messages to understand the overall topic and context. Summarize it concisely.',
    "Next, focus on the user's most recent message. Conduct a detailed analysis of the implicit context and what the pronouns refer to. Interpret the user's request and elaborate on their intent. Look for any unresolved requests or questions.",
    'Then, make a judgment on what you should do and set a goal. Look for what can be done in response to it.',
    'Finally, compile the information necessary to create a response to the user.'
  ],
  
  guidelines: [
    'Since the note is a text for the Assistant to read, "you" should refer to the Assistant.',
    'Remember that there are three roles of speakers in the dialogue environment: user, assistant, and system. Each statement should be interpreted separately.',
    "The key part of the Response Preparation Notes is understanding the user's question intent. Make sure to quote the user's message that needs to be responded to and create explanations for any pronouns or parts that implicitly refer to something.",
    "Based on the user's most recent message complexity, indicate in your Response Preparation Notes whether a concise or detailed response should be prepared."
  ],
  
  cue: [
    'The required output at this stage is the content of the Response Preparation Notes. As this is the first stage of the 2-pass process, do not output the response statement.',
    {
      type: 'subsection',
      content: '',
      title: 'Response Preparation Notes',
      items: ['']
    } as SubSectionElement
  ]
};

/**
 * Second pass of two-pass response - creates the Response Statement
 */
export const secondOfTwoPassResponse: PromptModule<DialogueContext> = {
  objective: [
    'Your task is to create responses in a two-pass process. The second pass is to create the Response Statement, referencing but not including the content of the Response Preparation Notes.'
  ],
  
  terms: [
    'Response Statement: A response statement to the user.',
    "Response Preparation Note: The initial output of the first pass in the two-pass process of creating responses. They are a detailed analysis and interpretation of the user's most recent message, including the implicit context and what the pronouns refer to. The purpose of these notes is to prepare for the creation of the Response Statement."
  ],
  
  instructions: [
    'Consider the Response Preparation Notes as a special part of the dialogue environment. Use them, along with the rest of the dialogue environment, to create a response statement.',
    'The output should be the response statement only.'
  ],
  
  preparationNote: [
    (context) => {
      if (!context.preparationNote?.content) return null;
      return {
        type: 'text',
        content: context.preparationNote.content
      };
    }
  ]
};

/**
 * Module for maintaining conversation state
 */
export const withTalkState: PromptModule<DialogueContext> = {
  terms: [
    'Current State: It is information about the context in which the dialogue environment exists; besides state, reference materials and logs of the last few conversations may be provided, but state is there to remember the state of the dialogue otherwise. These include "things to remember," "themes of the dialogue," and "summary of the conversation.".'
  ],
  
  state: [
    (context) => {
      if (!context.state?.content) return null;
      return {
        type: 'text',
        content: context.state.content
      };
    }
  ]
};