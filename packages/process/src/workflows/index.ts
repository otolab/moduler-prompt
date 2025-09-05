// Legacy stream workflow (backward compatibility)
export { 
  createStreamWorkflow, 
  executeStreamIteration,
  StreamProcessor 
} from './stream-workflow.js';
export type { 
  StreamWorkflowConfig,
  StreamWorkflowContext 
} from './stream-workflow.js';

// New workflow architecture
export type { 
  AIDriver,
  WorkflowResult,
  WorkflowError,
  Workflow
} from './types.js';
export { ModuleWorkflow } from './types.js';

export { DialogueWorkflow } from './dialogue-workflow.js';
export type { 
  DialogueWorkflowContext,
  DialogueWorkflowOptions 
} from './dialogue-workflow.js';

export { SummarizeWorkflow } from './summarize-workflow.js';
export type { 
  SummarizeWorkflowContext,
  SummarizeWorkflowOptions 
} from './summarize-workflow.js';

export { AnalysisWorkflow } from './analysis-workflow.js';
export type { 
  AnalysisContext,
  AnalysisOptions,
  AnalysisType 
} from './analysis-workflow.js';