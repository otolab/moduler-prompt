/**
 * Tests for merge functionality
 */

import { merge } from '../merge';
import type {
  PromptModule,
  SectionElement,
  SubSectionElement,
  TextElement,
  MessageElement,
  DynamicContent
} from '../types';

describe('merge', () => {
  describe('basic merging', () => {
    it('should merge two simple modules', () => {
      const module1: PromptModule = {
        objective: ['Task 1'],
        instructions: ['Step 1']
      };
      
      const module2: PromptModule = {
        objective: ['Task 2'],
        guidelines: ['Guide 1']
      };
      
      const merged = merge(module1, module2);
      
      expect(merged.objective).toEqual(['Task 1', 'Task 2']);
      expect(merged.instructions).toEqual(['Step 1']);
      expect(merged.guidelines).toEqual(['Guide 1']);
    });
    
    it('should handle empty modules', () => {
      const module1: PromptModule = {};
      const module2: PromptModule = {
        objective: ['Task']
      };
      
      const merged = merge(module1, module2);
      
      expect(merged.objective).toEqual(['Task']);
    });
    
    it('should merge multiple modules', () => {
      const module1: PromptModule = { objective: ['Task 1'] };
      const module2: PromptModule = { objective: ['Task 2'] };
      const module3: PromptModule = { objective: ['Task 3'] };
      
      const merged = merge(module1, module2, module3);
      
      expect(merged.objective).toEqual(['Task 1', 'Task 2', 'Task 3']);
    });
  });
  
  describe('createContext handling', () => {
    it('should use the first createContext found', () => {
      const context1 = { value: 1 };
      const context2 = { value: 2 };
      
      const module1: PromptModule<typeof context1> = {
        createContext: () => context1
      };
      
      const module2: PromptModule<typeof context2> = {
        createContext: () => context2
      };
      
      const merged = merge(module1, module2);
      
      expect(merged.createContext?.()).toBe(context1);
    });
  });
  
  describe('subsection merging', () => {
    it('should merge subsections with same title', () => {
      const subsection1: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Algorithm',
        items: ['Step 1', 'Step 2']
      };
      
      const subsection2: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Algorithm',
        items: ['Step 3']
      };
      
      const module1: PromptModule = {
        instructions: [subsection1]
      };
      
      const module2: PromptModule = {
        instructions: [subsection2]
      };
      
      const merged = merge(module1, module2);
      const mergedSubsection = merged.instructions?.[0] as SubSectionElement;
      
      expect(mergedSubsection.type).toBe('subsection');
      expect(mergedSubsection.title).toBe('Algorithm');
      expect(mergedSubsection.items).toEqual(['Step 1', 'Step 2', 'Step 3']);
    });
    
    it('should place subsections after plain items', () => {
      const subsection: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Details',
        items: ['Detail 1']
      };
      
      const module1: PromptModule = {
        instructions: [subsection, 'Plain text']
      };
      
      const module2: PromptModule = {
        instructions: ['Another text']
      };
      
      const merged = merge(module1, module2);
      
      // Order should be: plain texts first, then subsections
      expect(merged.instructions?.[0]).toBe('Plain text');
      expect(merged.instructions?.[1]).toBe('Another text');
      expect((merged.instructions?.[2] as SubSectionElement).type).toBe('subsection');
    });
  });
  
  describe('section merging', () => {
    it('should merge sections with same title', () => {
      const section1: SectionElement = {
        type: 'section',
        content: '',
        title: 'Processing',
        items: ['Process 1', 'Process 2']
      };
      
      const section2: SectionElement = {
        type: 'section',
        content: '',
        title: 'Processing',
        items: ['Process 3']
      };
      
      const module1: PromptModule = {
        processing: [section1]
      };
      
      const module2: PromptModule = {
        processing: [section2]
      };
      
      const merged = merge(module1, module2);
      const mergedSection = merged.processing?.[0] as SectionElement;
      
      expect(mergedSection.type).toBe('section');
      expect(mergedSection.title).toBe('Processing');
      expect(mergedSection.items).toEqual(['Process 1', 'Process 2', 'Process 3']);
    });
    
    it('should merge nested subsections within sections', () => {
      const subsection1: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'SubAlgo',
        items: ['Sub 1']
      };
      
      const subsection2: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'SubAlgo',
        items: ['Sub 2']
      };
      
      const section1: SectionElement = {
        type: 'section',
        content: '',
        title: 'MainProcess',
        items: ['Intro', subsection1]
      };
      
      const section2: SectionElement = {
        type: 'section',
        content: '',
        title: 'MainProcess',
        items: [subsection2, 'Outro']
      };
      
      const module1: PromptModule = {
        processing: [section1]
      };
      
      const module2: PromptModule = {
        processing: [section2]
      };
      
      const merged = merge(module1, module2);
      const mergedSection = merged.processing?.[0] as SectionElement;
      
      expect(mergedSection.items[0]).toBe('Intro');
      expect(mergedSection.items[1]).toBe('Outro');
      
      const mergedSubsection = mergedSection.items[2] as SubSectionElement;
      expect(mergedSubsection.type).toBe('subsection');
      expect(mergedSubsection.title).toBe('SubAlgo');
      expect(mergedSubsection.items).toEqual(['Sub 1', 'Sub 2']);
    });
  });
  
  describe('element ordering', () => {
    it('should maintain order: plain items → sections → subsections', () => {
      const text: TextElement = {
        type: 'text',
        content: 'Plain text element'
      };
      
      const section: SectionElement = {
        type: 'section',
        content: '',
        title: 'Section',
        items: ['Item']
      };
      
      const subsection: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Subsection',
        items: ['Item']
      };
      
      const module: PromptModule = {
        instructions: [subsection, 'String', section, text]
      };
      
      const merged = merge(module);
      
      expect(merged.instructions?.[0]).toBe('String');
      expect((merged.instructions?.[1] as TextElement).type).toBe('text');
      expect((merged.instructions?.[2] as SectionElement).type).toBe('section');
      expect((merged.instructions?.[3] as SubSectionElement).type).toBe('subsection');
    });
  });
  
  describe('dynamic content handling', () => {
    it('should preserve dynamic content functions', () => {
      const dynamicContent: DynamicContent = (context) => ({
        type: 'text',
        content: 'Dynamic'
      });
      
      const module1: PromptModule = {
        state: [dynamicContent]
      };
      
      const module2: PromptModule = {
        state: ['Static']
      };
      
      const merged = merge(module1, module2);
      
      expect(typeof merged.state?.[0]).toBe('function');
      expect(merged.state?.[1]).toBe('Static');
    });
  });
  
  describe('complex scenarios', () => {
    it('should handle mixed content types correctly', () => {
      const message: MessageElement = {
        type: 'message',
        content: 'Hello',
        role: 'user'
      };
      
      const section: SectionElement = {
        type: 'section',
        content: '',
        title: 'Complex',
        items: ['Item 1']
      };
      
      const subsection: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Sub',
        items: ['Sub 1']
      };
      
      const dynamic: DynamicContent = () => null;
      
      const module: PromptModule = {
        messages: [
          'String 1',
          subsection,
          message,
          section,
          dynamic,
          'String 2'
        ]
      };
      
      const merged = merge(module);
      
      // Check order
      expect(merged.messages?.[0]).toBe('String 1');
      expect(merged.messages?.[1]).toBe('String 2');
      expect((merged.messages?.[2] as MessageElement).type).toBe('message');
      expect(typeof merged.messages?.[3]).toBe('function');
      expect((merged.messages?.[4] as SectionElement).type).toBe('section');
      expect((merged.messages?.[5] as SubSectionElement).type).toBe('subsection');
    });
  });
});