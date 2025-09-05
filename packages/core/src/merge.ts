/**
 * Merge functionality for PromptModules
 */

import type {
  PromptModule,
  ModuleContent,
  Element,
  SectionElement,
  SubSectionElement,
  DynamicContent,
  Context
} from './types.js';

/**
 * Merge multiple prompt modules into one
 */
export function merge<T1 = Context, T2 = Context>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>
): PromptModule<T1 | T2>;

export function merge<T1 = Context, T2 = Context, T3 = Context>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>,
  module3: PromptModule<T3>
): PromptModule<T1 | T2 | T3>;

export function merge(...modules: PromptModule<any>[]): PromptModule<any> {
  if (modules.length === 0) {
    return {};
  }
  
  if (modules.length === 1) {
    return modules[0];
  }
  
  const merged: PromptModule<any> = {};
  
  // Handle createContext - use the first one found
  for (const module of modules) {
    if (module.createContext && !merged.createContext) {
      merged.createContext = module.createContext;
      break;
    }
  }
  
  // Get all unique section names
  const sectionNames = new Set<string>();
  for (const module of modules) {
    Object.keys(module).forEach(key => {
      if (key !== 'createContext') {
        sectionNames.add(key);
      }
    });
  }
  
  // Merge each section
  for (const sectionName of sectionNames) {
    const sectionsToMerge: ModuleContent[] = [];
    
    for (const module of modules) {
      if (module[sectionName]) {
        sectionsToMerge.push(module[sectionName]);
      }
    }
    
    if (sectionsToMerge.length > 0) {
      merged[sectionName] = mergeSections(...sectionsToMerge);
    }
  }
  
  return merged;
}

/**
 * Merge multiple sections into one
 */
function mergeSections(...sections: ModuleContent[]): ModuleContent {
  if (sections.length === 0) {
    return [];
  }
  
  if (sections.length === 1) {
    return sections[0];
  }
  
  const merged: ModuleContent = [];
  const subsectionMap = new Map<string, SubSectionElement>();
  const sectionMap = new Map<string, SectionElement>();
  const plainItems: (string | Element | DynamicContent)[] = [];
  
  // Classify and process all items
  for (const section of sections) {
    for (const item of section) {
      if (typeof item === 'function') {
        // DynamicContent - keep as is
        plainItems.push(item);
      } else if (typeof item === 'string') {
        // String - keep as is
        plainItems.push(item);
      } else if (typeof item === 'object' && 'type' in item) {
        // Element
        if (item.type === 'subsection') {
          const existing = subsectionMap.get(item.title);
          if (existing) {
            // Merge subsections with same title
            subsectionMap.set(item.title, {
              ...item,
              items: [...existing.items, ...item.items]
            });
          } else {
            subsectionMap.set(item.title, item as SubSectionElement);
          }
        } else if (item.type === 'section') {
          const existing = sectionMap.get(item.title);
          if (existing) {
            // Merge sections with same title
            sectionMap.set(item.title, {
              ...item,
              items: mergeSubItems(existing.items, (item as SectionElement).items)
            });
          } else {
            sectionMap.set(item.title, item as SectionElement);
          }
        } else {
          // Other elements
          plainItems.push(item);
        }
      } else {
        // Unknown - keep as is
        plainItems.push(item);
      }
    }
  }
  
  // Combine in order: plain items → sections → subsections
  merged.push(...plainItems);
  merged.push(...Array.from(sectionMap.values()));
  merged.push(...Array.from(subsectionMap.values()));
  
  return merged;
}

/**
 * Merge items within a SectionElement
 */
function mergeSubItems(
  items1: (string | SubSectionElement)[],
  items2: (string | SubSectionElement)[]
): (string | SubSectionElement)[] {
  const merged: (string | SubSectionElement)[] = [];
  const subsectionMap = new Map<string, SubSectionElement>();
  const strings: string[] = [];
  
  // Process all items
  for (const item of [...items1, ...items2]) {
    if (typeof item === 'string') {
      strings.push(item);
    } else {
      const existing = subsectionMap.get(item.title);
      if (existing) {
        // Merge subsection items
        subsectionMap.set(item.title, {
          ...item,
          items: [...existing.items, ...item.items]
        });
      } else {
        subsectionMap.set(item.title, item);
      }
    }
  }
  
  // Order: strings → subsections
  merged.push(...strings);
  merged.push(...Array.from(subsectionMap.values()));
  
  return merged;
}