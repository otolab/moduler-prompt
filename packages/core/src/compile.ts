/**
 * Compile functionality for PromptModules
 */

import type {
  PromptModule,
  ModuleContent,
  CompiledPrompt,
  Element,
  TextElement,
  DynamicContent,
  Context,
  SectionType,
  standardSections
} from './types.js';

import { standardSections as sections } from './types.js';

/**
 * Get section type by section name
 */
function getSectionType(sectionName: string): SectionType {
  const section = sections.find(s => s.name === sectionName);
  return section?.type || 'data'; // Default to 'data' for unknown sections
}

/**
 * Compile a PromptModule with context into a CompiledPrompt
 */
export function compile<TContext = Context>(
  module: PromptModule<TContext>,
  context: TContext
): CompiledPrompt {
  const compiled: CompiledPrompt = {
    instructions: [],
    data: [],
    output: []
  };
  
  // Process each section
  for (const [sectionName, sectionContent] of Object.entries(module)) {
    // Skip non-content properties
    if (sectionName === 'createContext' || !sectionContent) {
      continue;
    }
    
    // Get the section type
    const sectionType = getSectionType(sectionName);
    
    // Compile the section content
    const compiledElements = compileSection(
      sectionContent as ModuleContent<TContext>,
      context
    );
    
    // Add section header as a text element
    const sectionDef = sections.find(s => s.name === sectionName);
    if (sectionDef && compiledElements.length > 0) {
      const headerElement: TextElement = {
        type: 'text',
        content: `${sectionDef.title}\n${'='.repeat(sectionDef.title.length)}`
      };
      compiled[sectionType].push(headerElement);
    }
    
    // Add compiled elements
    compiled[sectionType].push(...compiledElements);
  }
  
  return compiled;
}

/**
 * Compile a section's content
 */
function compileSection<TContext>(
  content: ModuleContent<TContext>,
  context: TContext
): Element[] {
  const elements: Element[] = [];
  
  for (const item of content) {
    if (typeof item === 'function') {
      // Execute DynamicContent
      const result = (item as DynamicContent<TContext>)(context);
      
      if (result) {
        if (Array.isArray(result)) {
          // DynamicElement[]
          elements.push(...result);
        } else {
          // Single DynamicElement
          elements.push(result);
        }
      }
      // null/undefined results are ignored
    } else if (typeof item === 'string') {
      // Convert string to TextElement
      elements.push({
        type: 'text',
        content: item
      } as TextElement);
    } else if (typeof item === 'object' && 'type' in item) {
      // Already an Element (including SectionElement and SubSectionElement if statically defined)
      elements.push(item as Element);
    }
    // Unknown types are ignored
  }
  
  return elements;
}

/**
 * Helper function to create a context if module provides createContext
 */
export function createContext<TContext = Context>(
  module: PromptModule<TContext>
): TContext {
  if (module.createContext) {
    return module.createContext();
  }
  // Return empty object as fallback
  return {} as TContext;
}