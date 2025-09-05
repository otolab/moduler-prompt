export { withMaterials, answerWithReferences } from './material.js';
export type { MaterialContext } from './material.js';

export { streamProcessing } from './stream-processing.js';
export type { StreamProcessingContext } from './stream-processing.js';

export { 
  dialogueBase, 
  firstOfTwoPassResponse, 
  secondOfTwoPassResponse,
  withTalkState 
} from './dialogue.js';
export type { DialogueContext } from './dialogue.js';

export { 
  summarizeBase, 
  analyzeForSummary, 
  contentSummarize 
} from './summarize.js';
export type { SummarizeContext } from './summarize.js';