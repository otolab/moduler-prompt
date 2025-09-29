import { describe, it, expect } from 'vitest';
import { compile } from './compile.js';
import type { PromptModule } from './types.js';

describe('compile with static Elements', () => {
  describe('JSONElement', () => {
    it('should compile static JSONElement in schema section', () => {
      const module: PromptModule = {
        schema: [
          {
            type: 'json',
            content: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' }
              }
            }
          }
        ]
      };

      const result = compile(module);

      // JSONElementはoutputセクションに配置される（SectionElementなし）
      expect(result.output).toHaveLength(1);

      // JSONElementが直接追加される
      expect(result.output[0]).toEqual({
        type: 'json',
        content: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        }
      });
    });

    it('should compile JSONElement with string content', () => {
      const jsonString = '{"type": "object", "properties": {"id": {"type": "string"}}}';
      const module: PromptModule = {
        schema: [
          {
            type: 'json',
            content: jsonString
          }
        ]
      };

      const result = compile(module);

      expect(result.output[0]).toEqual({
        type: 'json',
        content: jsonString
      });
    });
  });

  describe('MaterialElement', () => {
    it('should compile static MaterialElement in materials section', () => {
      const module: PromptModule = {
        materials: [
          {
            type: 'material',
            id: 'api-doc',
            title: 'API Documentation',
            content: 'This is the API documentation content'
          }
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(1);

      // MaterialElementが直接追加される
      expect(result.data[0]).toEqual({
        type: 'material',
        id: 'api-doc',
        title: 'API Documentation',
        content: 'This is the API documentation content'
      });
    });

    it('should compile multiple MaterialElements', () => {
      const module: PromptModule = {
        materials: [
          {
            type: 'material',
            id: 'doc1',
            title: 'Doc 1',
            content: 'Content 1'
          },
          {
            type: 'material',
            id: 'doc2',
            title: 'Doc 2',
            content: 'Content 2'
          }
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('material');
      expect(result.data[1].type).toBe('material');
    });
  });

  describe('ChunkElement', () => {
    it('should compile static ChunkElement in chunks section', () => {
      const module: PromptModule = {
        chunks: [
          {
            type: 'chunk',
            content: 'Chunk content',
            partOf: 'document',
            index: 0,
            total: 3
          }
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        type: 'chunk',
        content: 'Chunk content',
        partOf: 'document',
        index: 0,
        total: 3
      });
    });
  });

  describe('MessageElement', () => {
    it('should compile static MessageElement in messages section', () => {
      const module: PromptModule = {
        messages: [
          {
            type: 'message',
            role: 'user',
            content: 'What is the weather?'
          },
          {
            type: 'message',
            role: 'assistant',
            content: 'I can help you check the weather.'
          }
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        type: 'message',
        role: 'user',
        content: 'What is the weather?'
      });
      expect(result.data[1]).toEqual({
        type: 'message',
        role: 'assistant',
        content: 'I can help you check the weather.'
      });
    });
  });

  describe('TextElement', () => {
    it('should compile static TextElement', () => {
      const module: PromptModule = {
        instructions: [
          {
            type: 'text',
            content: 'This is a text element'
          }
        ]
      };

      const result = compile(module);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toEqual({
        type: 'text',
        content: 'This is a text element'
      });
    });
  });

  describe('Mixed Elements', () => {
    it('should compile mixed static elements and strings', () => {
      const module: PromptModule = {
        materials: [
          'String content',
          {
            type: 'material',
            id: 'doc',
            title: 'Document',
            content: 'Document content'
          },
          'Another string'
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(2);

      // SectionElement with strings
      expect(result.data[0]).toEqual({
        type: 'section',
        category: 'data',
        title: 'Prepared Materials',
        items: ['String content', 'Another string']
      });

      // MaterialElement
      expect(result.data[1]).toEqual({
        type: 'material',
        id: 'doc',
        title: 'Document',
        content: 'Document content'
      });
    });

    it('should compile mixed elements with SubSectionElement', () => {
      const module: PromptModule = {
        instructions: [
          'Top level instruction',
          {
            type: 'subsection',
            title: 'Steps',
            items: ['Step 1', 'Step 2']
          },
          {
            type: 'text',
            content: 'Text element content'
          }
        ]
      };

      const result = compile(module);

      expect(result.instructions).toHaveLength(2);

      // SectionElement with string and subsection
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Instructions',
        items: [
          'Top level instruction',
          {
            type: 'subsection',
            title: 'Steps',
            items: ['Step 1', 'Step 2']
          }
        ]
      });

      // TextElement
      expect(result.instructions[1]).toEqual({
        type: 'text',
        content: 'Text element content'
      });
    });

    it('should compile elements with dynamic content', () => {
      interface Context {
        docId: string;
        docTitle: string;
      }

      const module: PromptModule<Context> = {
        createContext: () => ({
          docId: 'dynamic-doc',
          docTitle: 'Dynamic Document'
        }),

        materials: [
          // Static element
          {
            type: 'material',
            id: 'static-doc',
            title: 'Static Document',
            content: 'Static content'
          },
          // Dynamic element
          (ctx) => ({
            type: 'material' as const,
            id: ctx.docId,
            title: ctx.docTitle,
            content: 'Dynamic content'
          })
        ]
      };

      const result = compile(module);

      expect(result.data).toHaveLength(2);

      // Both static and dynamic MaterialElements should be present
      expect(result.data[0]).toEqual({
        type: 'material',
        id: 'static-doc',
        title: 'Static Document',
        content: 'Static content'
      });

      expect(result.data[1]).toEqual({
        type: 'material',
        id: 'dynamic-doc',
        title: 'Dynamic Document',
        content: 'Dynamic content'
      });
    });
  });

  describe('Nested SectionElement', () => {
    it('should handle nested SectionElement', () => {
      const module: PromptModule = {
        instructions: [
          'Outer instruction',
          {
            type: 'section',
            category: 'instructions',
            title: 'Nested Section',
            items: ['Nested item 1', 'Nested item 2']
          }
        ]
      };

      const result = compile(module);

      expect(result.instructions).toHaveLength(2);

      // Outer SectionElement
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Instructions',
        items: ['Outer instruction']
      });

      // Nested SectionElement (直接追加される)
      expect(result.instructions[1]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Nested Section',
        items: ['Nested item 1', 'Nested item 2']
      });
    });
  });

  describe('Extract outputSchema from JSONElement', () => {
    it('should extract outputSchema to metadata when JSONElement is in schema section', () => {
      const schemaObject = {
        type: 'object',
        properties: {
          result: { type: 'string' }
        },
        required: ['result']
      };

      const module: PromptModule = {
        schema: [
          'Schema description',
          {
            type: 'json',
            content: schemaObject
          }
        ]
      };

      const result = compile(module);

      // metadata.outputSchemaが設定されるべき
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.outputSchema).toEqual(schemaObject);
    });

    it('should handle JSONElement with string content for outputSchema', () => {
      const module: PromptModule = {
        schema: [
          {
            type: 'json',
            content: '{"type": "array", "items": {"type": "number"}}'
          }
        ]
      };

      const result = compile(module);

      expect(result.metadata?.outputSchema).toEqual({
        type: 'array',
        items: { type: 'number' }
      });
    });

    it('should not set outputSchema for JSONElement in non-schema sections', () => {
      const module: PromptModule = {
        materials: [
          {
            type: 'json',
            content: { some: 'data' }
          }
        ]
      };

      const result = compile(module);

      expect(result.metadata).toBeUndefined();
    });
  });
});