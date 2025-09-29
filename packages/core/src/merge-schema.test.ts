import { describe, it, expect } from 'vitest';
import { merge } from './merge.js';
import { compile } from './compile.js';
import type { PromptModule } from './types.js';

describe('merge with schema section', () => {
  it('should merge schema section when first module has no schema', () => {
    const module1: PromptModule = {
      objective: ['Process data'],
      instructions: ['Follow these steps']
    };

    const module2: PromptModule = {
      schema: [
        {
          type: 'json',
          content: {
            type: 'object',
            properties: {
              result: { type: 'string' }
            }
          }
        }
      ]
    };

    const merged = merge(module1, module2);

    expect(merged.schema).toBeDefined();
    expect(merged.schema).toHaveLength(1);
    expect(merged.schema![0]).toEqual({
      type: 'json',
      content: {
        type: 'object',
        properties: {
          result: { type: 'string' }
        }
      }
    });
  });

  it('should merge schema sections from both modules', () => {
    const module1: PromptModule = {
      schema: [
        'Schema description',
        {
          type: 'json',
          content: {
            type: 'object',
            properties: {
              field1: { type: 'string' }
            }
          }
        }
      ]
    };

    const module2: PromptModule = {
      schema: [
        {
          type: 'json',
          content: {
            type: 'object',
            properties: {
              field2: { type: 'number' }
            }
          }
        }
      ]
    };

    const merged = merge(module1, module2);

    expect(merged.schema).toBeDefined();
    expect(merged.schema).toHaveLength(3);

    // Check that all items are preserved
    expect(merged.schema![0]).toBe('Schema description');
    expect(merged.schema![1]).toEqual({
      type: 'json',
      content: {
        type: 'object',
        properties: {
          field1: { type: 'string' }
        }
      }
    });
    expect(merged.schema![2]).toEqual({
      type: 'json',
      content: {
        type: 'object',
        properties: {
          field2: { type: 'number' }
        }
      }
    });
  });

  it('should compile merged module with schema and set outputSchema', () => {
    const module1: PromptModule = {
      objective: ['Analyze data'],
      state: ['Current state']
    };

    const module2: PromptModule = {
      instructions: ['Generate JSON output'],
      schema: [
        {
          type: 'json',
          content: {
            type: 'object',
            properties: {
              analysis: { type: 'string' },
              score: { type: 'number' }
            },
            required: ['analysis']
          }
        }
      ]
    };

    const merged = merge(module1, module2);
    const compiled = compile(merged);

    // Check that outputSchema is set
    expect(compiled.metadata).toBeDefined();
    expect(compiled.metadata?.outputSchema).toEqual({
      type: 'object',
      properties: {
        analysis: { type: 'string' },
        score: { type: 'number' }
      },
      required: ['analysis']
    });

    // Check that JSONElement is in output section
    const jsonElements = compiled.output.filter(e => e.type === 'json');
    expect(jsonElements).toHaveLength(1);
    expect(jsonElements[0]).toEqual({
      type: 'json',
      content: {
        type: 'object',
        properties: {
          analysis: { type: 'string' },
          score: { type: 'number' }
        },
        required: ['analysis']
      }
    });
  });

  it('should handle multiple JSONElements in merged schema', () => {
    const module1: PromptModule = {
      schema: [
        {
          type: 'json',
          content: '{"type": "object"}'
        }
      ]
    };

    const module2: PromptModule = {
      schema: [
        {
          type: 'json',
          content: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      ]
    };

    const merged = merge(module1, module2);
    const compiled = compile(merged);

    // Should use the first JSONElement for outputSchema
    expect(compiled.metadata?.outputSchema).toEqual({
      type: 'object'
    });

    // But both JSONElements should be in the output
    const jsonElements = compiled.output.filter(e => e.type === 'json');
    expect(jsonElements).toHaveLength(2);
  });

  it('should preserve other Elements in schema section', () => {
    const module1: PromptModule = {
      schema: [
        {
          type: 'text',
          content: 'Schema explanation'
        },
        {
          type: 'material',
          id: 'schema-doc',
          title: 'Schema Documentation',
          content: 'Detailed schema docs'
        }
      ]
    };

    const module2: PromptModule = {
      schema: [
        {
          type: 'json',
          content: {
            type: 'object'
          }
        }
      ]
    };

    const merged = merge(module1, module2);

    expect(merged.schema).toHaveLength(3);
    expect(merged.schema![0]).toEqual({
      type: 'text',
      content: 'Schema explanation'
    });
    expect(merged.schema![1]).toEqual({
      type: 'material',
      id: 'schema-doc',
      title: 'Schema Documentation',
      content: 'Detailed schema docs'
    });
    expect(merged.schema![2]).toEqual({
      type: 'json',
      content: {
        type: 'object'
      }
    });
  });

  it('should handle complex merge scenario', () => {
    // First module: no schema
    const statePromptModule: PromptModule = {
      objective: ['Manage state'],
      state: ['Current application state']
    };

    // Second module: has schema with JSONElement
    const baseAnalyzeModule: PromptModule = {
      instructions: ['Analyze the impact'],
      schema: [
        'Output the analysis in JSON format:',
        {
          type: 'json',
          content: {
            type: 'object',
            properties: {
              impactLevel: {
                type: 'string',
                enum: ['high', 'medium', 'low']
              },
              affectedComponents: {
                type: 'array',
                items: { type: 'string' }
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['impactLevel', 'affectedComponents']
          }
        }
      ]
    };

    // Merge the modules
    const merged = merge(statePromptModule, baseAnalyzeModule);

    // Verify schema is properly merged
    expect(merged.schema).toBeDefined();
    expect(merged.schema).toHaveLength(2);
    expect(merged.schema![0]).toBe('Output the analysis in JSON format:');
    expect(merged.schema![1]).toHaveProperty('type', 'json');

    // Compile and verify outputSchema is set
    const compiled = compile(merged);
    expect(compiled.metadata?.outputSchema).toBeDefined();
    expect(compiled.metadata?.outputSchema).toEqual({
      type: 'object',
      properties: {
        impactLevel: {
          type: 'string',
          enum: ['high', 'medium', 'low']
        },
        affectedComponents: {
          type: 'array',
          items: { type: 'string' }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['impactLevel', 'affectedComponents']
    });
  });
});