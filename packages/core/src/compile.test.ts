/**
 * Tests for compile functionality
 */

import { compile, createContext } from '../compile';
import type {
  PromptModule,
  SectionElement,
  SubSectionElement,
  TextElement,
  MessageElement,
  MaterialElement,
  ChunkElement,
  DynamicContent,
  DynamicElement
} from '../types';

describe('compile', () => {
  describe('basic compilation', () => {
    it('should compile strings to TextElements', () => {
      const module: PromptModule = {
        objective: ['Be helpful', 'Be accurate'],
        instructions: ['Step 1', 'Step 2']
      };
      
      const compiled = compile(module, {});
      
      // Check instructions section
      const objectiveHeader = compiled.instructions[0] as TextElement;
      expect(objectiveHeader.type).toBe('text');
      expect(objectiveHeader.content).toContain('Objective and Role');
      
      const objective1 = compiled.instructions[1] as TextElement;
      expect(objective1.type).toBe('text');
      expect(objective1.content).toBe('Be helpful');
      
      const objective2 = compiled.instructions[2] as TextElement;
      expect(objective2.type).toBe('text');
      expect(objective2.content).toBe('Be accurate');
    });
    
    it('should preserve existing Elements', () => {
      const message: MessageElement = {
        type: 'message',
        content: 'Hello',
        role: 'user',
        name: 'John'
      };
      
      const module: PromptModule = {
        messages: [message]
      };
      
      const compiled = compile(module, {});
      
      const compiledMessage = compiled.data[1] as MessageElement;
      expect(compiledMessage).toEqual(message);
    });
    
    it('should organize elements by section type', () => {
      const module: PromptModule = {
        // Instructions type
        objective: ['Objective'],
        guidelines: ['Guideline'],
        
        // Data type
        state: ['State'],
        materials: ['Material'],
        
        // Output type
        cue: ['Output cue'],
        schema: ['Schema']
      };
      
      const compiled = compile(module, {});
      
      // Check that sections are properly categorized
      expect(compiled.instructions.some(e => 
        e.type === 'text' && e.content.includes('Objective and Role')
      )).toBe(true);
      expect(compiled.instructions.some(e => 
        e.type === 'text' && e.content.includes('Guidelines')
      )).toBe(true);
      
      expect(compiled.data.some(e => 
        e.type === 'text' && e.content.includes('Current State')
      )).toBe(true);
      expect(compiled.data.some(e => 
        e.type === 'text' && e.content.includes('Prepared Materials')
      )).toBe(true);
      
      expect(compiled.output.some(e => 
        e.type === 'text' && e.content.includes('Output')
      )).toBe(true);
      expect(compiled.output.some(e => 
        e.type === 'text' && e.content.includes('Output Schema')
      )).toBe(true);
    });
  });
  
  describe('dynamic content execution', () => {
    it('should execute dynamic content with context', () => {
      interface TestContext {
        value: string;
      }
      
      const dynamic: DynamicContent<TestContext> = (context) => ({
        type: 'text',
        content: `Value: ${context.value}`
      });
      
      const module: PromptModule<TestContext> = {
        state: [dynamic]
      };
      
      const context: TestContext = { value: 'test' };
      const compiled = compile(module, context);
      
      const dynamicResult = compiled.data[1] as TextElement;
      expect(dynamicResult.type).toBe('text');
      expect(dynamicResult.content).toBe('Value: test');
    });
    
    it('should handle dynamic content returning arrays', () => {
      interface TestContext {
        items: string[];
      }
      
      const dynamic: DynamicContent<TestContext> = (context) => 
        context.items.map(item => ({
          type: 'text',
          content: item
        } as TextElement));
      
      const module: PromptModule<TestContext> = {
        chunks: [dynamic]
      };
      
      const context: TestContext = { items: ['Item 1', 'Item 2'] };
      const compiled = compile(module, context);
      
      const item1 = compiled.data[1] as TextElement;
      const item2 = compiled.data[2] as TextElement;
      
      expect(item1.content).toBe('Item 1');
      expect(item2.content).toBe('Item 2');
    });
    
    it('should handle dynamic content returning null', () => {
      const dynamic: DynamicContent = () => null;
      
      const module: PromptModule = {
        state: ['Before', dynamic, 'After']
      };
      
      const compiled = compile(module, {});
      
      // null result should be ignored
      const before = compiled.data[1] as TextElement;
      const after = compiled.data[2] as TextElement;
      
      expect(before.content).toBe('Before');
      expect(after.content).toBe('After');
      expect(compiled.data.length).toBe(3); // Header + 2 items
    });
    
    it('should not allow dynamic content to create SectionElement', () => {
      // This test verifies the type system constraint
      // Dynamic content cannot return SectionElement or SubSectionElement
      
      const dynamic: DynamicContent = () => ({
        type: 'text',
        content: 'Valid dynamic element'
      });
      
      // The following would be a TypeScript error:
      // const invalid: DynamicContent = () => ({
      //   type: 'section',
      //   content: '',
      //   title: 'Invalid',
      //   items: []
      // } as SectionElement);
      
      const module: PromptModule = {
        instructions: [dynamic]
      };
      
      const compiled = compile(module, {});
      
      const result = compiled.instructions[1] as TextElement;
      expect(result.type).toBe('text');
    });
  });
  
  describe('section and subsection handling', () => {
    it('should compile static SectionElements', () => {
      const section: SectionElement = {
        type: 'section',
        content: '',
        title: 'Algorithm',
        items: ['Step 1', 'Step 2']
      };
      
      const module: PromptModule = {
        processing: [section]
      };
      
      const compiled = compile(module, {});
      
      // Should have header + section
      const sectionElement = compiled.instructions[1] as SectionElement;
      expect(sectionElement.type).toBe('section');
      expect(sectionElement.title).toBe('Algorithm');
      expect(sectionElement.items).toEqual(['Step 1', 'Step 2']);
    });
    
    it('should compile nested SubSectionElements', () => {
      const subsection: SubSectionElement = {
        type: 'subsection',
        content: '',
        title: 'Details',
        items: ['Detail 1', 'Detail 2']
      };
      
      const section: SectionElement = {
        type: 'section',
        content: '',
        title: 'Main',
        items: ['Intro', subsection]
      };
      
      const module: PromptModule = {
        instructions: [section]
      };
      
      const compiled = compile(module, {});
      
      const compiledSection = compiled.instructions[1] as SectionElement;
      expect(compiledSection.items[0]).toBe('Intro');
      
      const compiledSubsection = compiledSection.items[1] as SubSectionElement;
      expect(compiledSubsection.type).toBe('subsection');
      expect(compiledSubsection.items).toEqual(['Detail 1', 'Detail 2']);
    });
  });
  
  describe('createContext helper', () => {
    it('should call createContext if provided', () => {
      interface TestContext {
        initialized: boolean;
      }
      
      const module: PromptModule<TestContext> = {
        createContext: () => ({ initialized: true })
      };
      
      const context = createContext(module);
      
      expect(context.initialized).toBe(true);
    });
    
    it('should return empty object if createContext not provided', () => {
      const module: PromptModule = {
        objective: ['Test']
      };
      
      const context = createContext(module);
      
      expect(context).toEqual({});
    });
  });
  
  describe('real-world scenarios', () => {
    it('should compile a streaming processing module', () => {
      interface StreamingContext {
        state: { content: string; usage: number };
        chunks: Array<{ content: string; partOf: string; usage: number }>;
        range: { start: number; end: number };
      }
      
      const module: PromptModule<StreamingContext> = {
        createContext: () => ({
          state: { content: '', usage: 0 },
          chunks: [],
          range: { start: 0, end: 0 }
        }),
        
        objective: ['Process chunks in streaming fashion'],
        
        processing: [{
          type: 'section',
          content: '',
          title: 'Algorithm',
          items: [
            'Read current state',
            {
              type: 'subsection',
              content: '',
              title: 'Processing Steps',
              items: ['Process chunk', 'Update state', 'Output result']
            } as SubSectionElement
          ]
        } as SectionElement],
        
        state: [
          (context: StreamingContext) => ({
            type: 'text',
            content: `Current state: ${context.state.content}`
          } as TextElement)
        ],
        
        chunks: [
          (context: StreamingContext) => 
            context.chunks.slice(context.range.start, context.range.end)
              .map(chunk => ({
                type: 'chunk',
                content: chunk.content,
                partOf: chunk.partOf,
                usage: chunk.usage
              } as ChunkElement))
        ]
      };
      
      const context = createContext(module);
      context.chunks = [
        { content: 'Chunk 1', partOf: 'file.txt', usage: 10 },
        { content: 'Chunk 2', partOf: 'file.txt', usage: 15 }
      ];
      context.range = { start: 0, end: 2 };
      context.state.content = 'Previous state';
      
      const compiled = compile(module, context);
      
      // Check objective
      const objective = compiled.instructions.find(e => 
        e.type === 'text' && e.content === 'Process chunks in streaming fashion'
      );
      expect(objective).toBeDefined();
      
      // Check processing section
      const processingSection = compiled.instructions.find(e => 
        e.type === 'section'
      ) as SectionElement;
      expect(processingSection).toBeDefined();
      expect(processingSection.title).toBe('Algorithm');
      
      // Check state
      const stateText = compiled.data.find(e => 
        e.type === 'text' && e.content.includes('Previous state')
      );
      expect(stateText).toBeDefined();
      
      // Check chunks
      const chunks = compiled.data.filter(e => e.type === 'chunk');
      expect(chunks.length).toBe(2);
      expect((chunks[0] as ChunkElement).partOf).toBe('file.txt');
    });
    
    it('should compile a dialogue module', () => {
      interface DialogueContext {
        messages: Array<{ content: string; role: 'user' | 'assistant'; name?: string }>;
        materials?: Array<{ id: string; title: string; content: string; usage: number }>;
      }
      
      const module: PromptModule<DialogueContext> = {
        createContext: () => ({
          messages: [],
          materials: []
        }),
        
        objective: ['Engage in helpful dialogue'],
        
        messages: [
          (context: DialogueContext) =>
            context.messages.map(msg => ({
              type: 'message',
              content: msg.content,
              role: msg.role,
              name: msg.name
            } as MessageElement))
        ],
        
        materials: [
          (context: DialogueContext) =>
            context.materials?.map(mat => ({
              type: 'material',
              content: mat.content,
              id: mat.id,
              title: mat.title,
              usage: mat.usage
            } as MaterialElement)) || []
        ]
      };
      
      const context: DialogueContext = {
        messages: [
          { content: 'Hello', role: 'user', name: 'Alice' },
          { content: 'Hi there!', role: 'assistant' }
        ],
        materials: [
          { id: 'doc1', title: 'Guide', content: 'Guidelines', usage: 50 }
        ]
      };
      
      const compiled = compile(module, context);
      
      // Check messages
      const messages = compiled.data.filter(e => e.type === 'message');
      expect(messages.length).toBe(2);
      expect((messages[0] as MessageElement).role).toBe('user');
      expect((messages[0] as MessageElement).name).toBe('Alice');
      
      // Check materials
      const materials = compiled.data.filter(e => e.type === 'material');
      expect(materials.length).toBe(1);
      expect((materials[0] as MaterialElement).title).toBe('Guide');
    });
  });
});