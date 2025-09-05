/**
 * Core type definitions for the Modular Prompt Framework
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Content with token usage information
 */
export interface ContentWithUsage {
  content: string;
  usage: number;
}

/**
 * Attachment for multimodal content
 */
export interface Attachment {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { path: string; mime_type: string };
}

// ============================================================================
// Element Types
// ============================================================================

/**
 * Base element interface
 */
interface BaseElement {
  type: string;
  content: string | Attachment[];
}

/**
 * Text element - simple text content
 */
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
}

/**
 * Message element - chat message with role
 */
export interface MessageElement extends BaseElement {
  type: 'message';
  content: string;
  role: 'system' | 'assistant' | 'user';
  name?: string;
  attachments?: Attachment[];
}

/**
 * Material element - reference material
 */
export interface MaterialElement extends BaseElement {
  type: 'material';
  content: string;
  id: string;
  title: string;
  usage?: number;
  attachments?: Attachment[];
}

/**
 * Chunk element - split text chunk
 */
export interface ChunkElement extends BaseElement {
  type: 'chunk';
  content: string;
  partOf: string;
  index?: number;
  usage?: number;
  attachments?: Attachment[];
}

/**
 * Section element (first level hierarchy)
 */
export interface SectionElement extends BaseElement {
  type: 'section';
  content: string;
  title: string;
  items: (string | SubSectionElement)[];  // Items are interpreted as bullet points
}

/**
 * Subsection element (second level hierarchy)
 */
export interface SubSectionElement extends BaseElement {
  type: 'subsection';
  content: string;
  title: string;
  items: string[];  // Only strings, interpreted as bullet points
}

/**
 * All element types
 */
export type Element = 
  | TextElement
  | MessageElement
  | MaterialElement
  | ChunkElement
  | SectionElement
  | SubSectionElement;

/**
 * Elements that can be dynamically generated
 * (excludes SectionElement and SubSectionElement)
 */
export type DynamicElement = 
  | TextElement
  | MessageElement
  | MaterialElement
  | ChunkElement;

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context is freely defined by each PromptModule
 * Core framework only defines that Context exists
 */
export type Context = any;

/**
 * Common context types for reuse (not enforced)
 */

export interface Material extends ContentWithUsage {
  id: string;
  title: string;
  attachments?: Attachment[];
}

export interface Chunk extends ContentWithUsage {
  partOf: string;
  attachments?: Attachment[];
}

export interface Message {
  content: string;
  role: 'system' | 'assistant' | 'user';
  usage?: number;
  name?: string;
  attachments?: Attachment[];
}

// ============================================================================
// Section Definitions
// ============================================================================

/**
 * Section type classification
 */
export type SectionType = 'instructions' | 'data' | 'output';

/**
 * Section definition
 */
export interface SectionDefinition {
  name: string;
  type: SectionType;
  title: string;
}

/**
 * Standard sections provided by the framework
 */
export const standardSections: SectionDefinition[] = [
  // Instructions sections
  { name: 'objective', type: 'instructions', title: 'Objective and Role' },
  { name: 'terms', type: 'instructions', title: 'Term Explanations' },
  { name: 'processing', type: 'instructions', title: 'Processing Algorithm' },
  { name: 'instructions', type: 'instructions', title: 'Instructions' },
  { name: 'guidelines', type: 'instructions', title: 'Guidelines' },
  { name: 'preparationNote', type: 'instructions', title: 'Response Preparation Note' },
  
  // Data sections
  { name: 'state', type: 'data', title: 'Current State' },
  { name: 'materials', type: 'data', title: 'Prepared Materials' },
  { name: 'chunks', type: 'data', title: 'Input Chunks' },
  { name: 'messages', type: 'data', title: 'Messages' },
  
  // Output sections
  { name: 'cue', type: 'output', title: 'Output' },
  { name: 'schema', type: 'output', title: 'Output Schema' }
];

// ============================================================================
// Module Types
// ============================================================================

/**
 * Dynamic content generator function
 */
export type DynamicContent<TContext = Context> = (
  context: TContext
) => DynamicElement[] | DynamicElement | null;

/**
 * Module content can be string, Element, or DynamicContent
 */
export type ModuleContent<TContext = Context> = (
  | string
  | Element
  | DynamicContent<TContext>
)[];

/**
 * Prompt module definition
 */
export interface PromptModule<TContext = Context> {
  // Context creation
  createContext?: () => TContext;
  
  // Instructions sections
  objective?: ModuleContent<TContext>;
  terms?: ModuleContent<TContext>;
  processing?: ModuleContent<TContext>;
  instructions?: ModuleContent<TContext>;
  guidelines?: ModuleContent<TContext>;
  preparationNote?: ModuleContent<TContext>;
  
  // Data sections
  state?: ModuleContent<TContext>;
  materials?: ModuleContent<TContext>;
  chunks?: ModuleContent<TContext>;
  messages?: ModuleContent<TContext>;
  
  // Output sections
  cue?: ModuleContent<TContext>;
  schema?: ModuleContent<TContext>;
  
  // Allow custom sections (for future extension)
  [key: string]: any;
}

// ============================================================================
// Compiled Types
// ============================================================================

/**
 * Compiled prompt with elements organized by section type
 */
export interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
}