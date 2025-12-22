import type { PromptModule, SubSectionElement, TextElement } from '@modular-prompt/core';

/**
 * Context for summarization modules
 */
export interface SummarizeContext {
  state?: {
    content: string;
    usage?: number;
  };
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
  }>;
  preparationNote?: {
    content: string;
  };
  targetTokens?: number;
}

/**
 * Base summarization module
 */
export const summarizeBase: PromptModule<SummarizeContext> = {
  objective: [
    'The streaming process generates a summary. The Current State is the summary up to the previous iteration, which is merged with the summary of the chunks given in this iteration and output as the Next State.'
  ]
};

/**
 * Analysis module for summary preparation
 */
export const analyzeForSummary: PromptModule<SummarizeContext> = {
  objective: [
    'The purpose of this streaming process is to generate an Analysis Report of the source text. The focus should be on the analysis results, not on preserving the original content of the source text. The process holds the text of the analysis results up to that point as the State, and updates it with each iteration.'
  ],
  
  terms: [
    'Analysis Report: The analysis result of the source text. It consists of the following sections: Purpose of the Text, Document Structure, Overview, and Metadata Insights.'
  ],
  
  instructions: [
    'Please ensure that only the Next State, which should be the updated analysis report considering this iteration\'s results, is outputted. It should not include the original source text of the Input Chunks.',
    {
      type: 'subsection',
      content: '',
      title: 'Algorithm',
      items: [
        'Steps:',
        '1. The Current State is the Analyze Report up to the previous iteration. Please read and understand it carefully.',
        '2. Analyze the content of the chunk given in this iteration.',
        '3. Follow the procedures outlined in the "Section Definitions & Procedures of Analysis Report" to merge and update the analysis result of this iteration into each section, thereby generating a new Analysis Report. If there is no particular information to be incorporated into the report, simply ignore it and the Next State will remain as the unchanged Current State.',
        '4. Output the entire new Analysis Report as the Next State.'
      ]
    } as SubSectionElement
  ],
  
  guidelines: [
    'Please note that the Analysis Report created in the current iteration does not need to be complete. Perform the analysis based solely on the input data.',
    {
      type: 'subsection',
      content: '',
      title: 'Section Definitions & Procedures of Analysis Report',
      items: [
        '1. Purpose of the Text:',
        '  - Definition: You should include one or a few paragraphs that analytically interpret the purpose of the source text and summarize it concisely. This often includes content found in the introduction or summary of the original text.',
        '  - Procedure: Read the source text, understand its purpose, and summarize it concisely.',
        '2. Document Structure:',
        '  - Definition: You should list the titles of the chapters in bullet point format, including chapter numbers if they exist. If the chapters are not clear, provide a concise list of the text structure.',
        '  - Procedure: Given the sequential nature of the chunks, collect all chapter headers in an appending process, ensuring no part of the structure, including nested sections, is missed.',
        '3. Overview:',
        '  - Definition: This is a broad summary of the original text. Discard the details and condense the main arguments of the entire text into a few paragraphs.',
        '  - Procedure: Merge the information of the given chunk into the already existing text of 3. In other words, update the overall summary while incorporating new information.',
        '4. Metadata Insights:',
        '  - Definition: This section is intended to hold aggregated metadata that provides a broader understanding of the source text.',
        '  - Procedure: Identify and collect metadata such as the date of text creation, keywords, significant references, and a possible summary of the comment section from the source text.'
      ]
    } as SubSectionElement
  ]
};

/**
 * Content summarization module
 */
export const contentSummarize: PromptModule<SummarizeContext> = {
  objective: [
    'The assistant is a software engineer who prepares the condensed output text that replaces the source text.',
    'The amount of information should be adjusted to meet that value as much as possible without exceeding the target size. In particular, the max_tokens limit must be observed.'
  ],
  
  terms: [
    'Analysis Report: This represents the analysis results of the input chunks. It may not be perfect and could contain errors or omissions. However, it can be used to grasp an overall understanding that cannot be obtained from individual chunks. Always refer back to the input chunks for the most accurate information.'
  ],
  
  instructions: [
    {
      type: 'subsection',
      content: '',
      title: 'Algorithm',
      items: [
        '1. Start by reviewing the Analysis Report to understand the overall structure and content of the source text.',
        '2. Identify the type of the given Data Chunks (e.g., whether it\'s a descriptive text, a conversation log, etc.), and understand how each chunk is positioned within the overall context.',
        '3. Understand the structure of the Data Chunk texts, such as its chapters, and discern what is being asserted in each part.',
        '4. Summarize the content being asserted in each block of the Data Chunk texts, using the Analysis Report as a guide to ensure the summaries align with the overall understanding of the source text.',
        '5. Merge the summaries from step 4 with the content of the Current Text State, and format it into a continuous, natural text.',
        '6. Output the entire text generated in step 5 without blocking or fragmenting it.'
      ]
    } as SubSectionElement
  ],
  
  guidelines: [
    'If the Analysis Report includes an overview or summary of the source text, use this as a starting point for the summary, and then add more detail from the Data Chunks as needed.'
  ],
  
  preparationNote: [
    (context) => {
      if (!context.preparationNote?.content) return null;
      return {
        type: 'text',
        content: context.preparationNote.content
      } as TextElement;
    }
  ]
};