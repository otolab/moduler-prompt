import { describe, it, expect, beforeEach } from 'vitest';
import { TestDriver } from './test-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { FormatterOptions } from './formatter/types.js';

describe('TestDriver', () => {
  let driver: TestDriver;
  
  beforeEach(() => {
    driver = new TestDriver();
  });
  
  describe('query', () => {
    it('throws error when no responses provided', async () => {
      const compiledPrompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test prompt' }],
        data: [],
        output: []
      };
      await expect(driver.query(compiledPrompt)).rejects.toThrow('No more responses available');
    });
    
    it('returns responses in sequence', async () => {
      driver = new TestDriver({
        responses: ['First', 'Second', 'Third']
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'prompt' }],
        data: [],
        output: []
      };
      
      expect((await driver.query(prompt)).content).toBe('First');
      expect((await driver.query(prompt)).content).toBe('Second');
      expect((await driver.query(prompt)).content).toBe('Third');
    });
    
    it('throws error when no more responses available', async () => {
      driver = new TestDriver({
        responses: ['Only one']
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      await driver.query(prompt); // Use the only response
      await expect(driver.query(prompt)).rejects.toThrow('No more responses available');
    });
    
    it('handles CompiledPrompt input', async () => {
      driver = new TestDriver({
        responses: ['Test response']
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Hello' }],
        data: [{ type: 'text', content: 'World' }],
        output: []
      };
      
      const result = await driver.query(prompt);
      expect(result.content).toBe('Test response');
    });
    
    it('simulates delay', async () => {
      driver = new TestDriver({ 
        responses: ['Delayed response'],
        delay: 100 
      });
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      const start = Date.now();
      await driver.query(prompt);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(90);
    });
  });
  
  
  describe('streamQuery', () => {
    it('streams response character by character', async () => {
      driver = new TestDriver({
        responses: ['Hello']
      });
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      const { stream } = await driver.streamQuery(prompt);

      const chars: string[] = [];
      for await (const char of stream) {
        chars.push(char);
      }

      expect(chars.join('')).toBe('Hello');
      expect(chars).toEqual(['H', 'e', 'l', 'l', 'o']);
    });
    
    it('streams multiple responses in sequence', async () => {
      driver = new TestDriver({
        responses: ['Hi', 'Bye']
      });
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      const { stream: stream1 } = await driver.streamQuery(prompt);
      const chars1: string[] = [];
      for await (const char of stream1) {
        chars1.push(char);
      }
      expect(chars1.join('')).toBe('Hi');

      const { stream: stream2 } = await driver.streamQuery(prompt);
      const chars2: string[] = [];
      for await (const char of stream2) {
        chars2.push(char);
      }
      expect(chars2.join('')).toBe('Bye');
    });
    
    it('throws error when no more responses available', async () => {
      driver = new TestDriver({
        responses: []
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      await expect(driver.streamQuery(prompt)).rejects.toThrow('No more responses available');
    });
  });
  
  describe('response provider function', () => {
    it('uses response provider function', async () => {
      let callCount = 0;
      const driver = new TestDriver({
        responses: () => {
          callCount++;
          return `Response ${callCount}`;
        }
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      expect((await driver.query(prompt)).content).toBe('Response 1');
      expect((await driver.query(prompt)).content).toBe('Response 2');
      expect((await driver.query(prompt)).content).toBe('Response 3');
    });
    
    it('uses async response provider function', async () => {
      const driver = new TestDriver({
        responses: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'Async response';
        }
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      expect((await driver.query(prompt)).content).toBe('Async response');
    });
    
    it('streams with response provider function', async () => {
      const driver = new TestDriver({
        responses: () => 'ABC'
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      const { stream } = await driver.streamQuery(prompt);

      const chars: string[] = [];
      for await (const char of stream) {
        chars.push(char);
      }

      expect(chars).toEqual(['A', 'B', 'C']);
    });
  });

  describe('utility methods', () => {
    it('closes driver', async () => {
      await expect(driver.close()).resolves.toBeUndefined();
    });
  });

  describe('formatter options', () => {
    it('uses formatter options for prompt formatting', async () => {
      const driver = new TestDriver({
        responses: ['Test response'],
        formatterOptions: {
          markers: {
            materialStart: '=== ',
            materialEnd: ' ==='
          }
        }
      });

      const prompt: CompiledPrompt = {
        instructions: [
          {
            type: 'section',
            title: 'Test Section',
            content: 'Test content',
            items: ['Item 1', 'Item 2']
          }
        ],
        data: [],
        output: []
      };

      const result = await driver.query(prompt);

      // The driver should use the formatter options internally
      // We're mainly testing that it doesn't crash and returns expected result
      expect(result.content).toBe('Test response');
      expect(result.usage).toBeDefined();
      expect(result.usage?.promptTokens).toBeGreaterThan(0);
    });
  });

  describe('structured outputs', () => {
    it('extracts JSON when outputSchema is provided', async () => {
      const driver = new TestDriver({
        responses: ['{"name": "Alice", "age": 30}']
      });

      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate user data' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      };

      const result = await driver.query(prompt);
      expect(result.content).toBe('{"name": "Alice", "age": 30}');
      expect(result.structuredOutputs).toEqual([{ name: 'Alice', age: 30 }]);
    });

    it('handles JSON in markdown code blocks', async () => {
      const driver = new TestDriver({
        responses: ['Here is the result:\n```json\n{"status": "success", "count": 42}\n```']
      });

      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate status' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      };

      const result = await driver.query(prompt);
      expect(result.structuredOutputs).toEqual([{ status: 'success', count: 42 }]);
    });

    it('returns undefined structuredOutputs when no schema provided', async () => {
      const driver = new TestDriver({
        responses: ['{"name": "Bob"}']
      });

      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate data' }],
        data: [],
        output: []
      };

      const result = await driver.query(prompt);
      expect(result.content).toBe('{"name": "Bob"}');
      expect(result.structuredOutputs).toBeUndefined();
    });

    it('returns undefined structuredOutputs when no valid JSON found', async () => {
      const driver = new TestDriver({
        responses: ['This is plain text response']
      });

      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate data' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: { type: 'object' }
        }
      };

      const result = await driver.query(prompt);
      expect(result.content).toBe('This is plain text response');
      expect(result.structuredOutputs).toBeUndefined();
    });

    it('handles structured outputs in streamQuery', async () => {
      const driver = new TestDriver({
        responses: ['{"items": [1, 2, 3]}']
      });

      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate array' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              items: { type: 'array' }
            }
          }
        }
      };

      const { result } = await driver.streamQuery(prompt);
      const queryResult = await result;

      expect(queryResult.content).toBe('{"items": [1, 2, 3]}');
      expect(queryResult.structuredOutputs).toEqual([{ items: [1, 2, 3] }]);
    });

    it('works with response provider function', async () => {
      const driver = new TestDriver({
        responses: (prompt) => {
          if (prompt.metadata?.outputSchema) {
            return '{"result": "structured"}';
          }
          return 'plain text';
        }
      });

      const promptWithSchema: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: { type: 'object' }
        }
      };

      const result = await driver.query(promptWithSchema);
      expect(result.structuredOutputs).toEqual([{ result: 'structured' }]);

      const promptWithoutSchema: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate' }],
        data: [],
        output: []
      };

      const result2 = await driver.query(promptWithoutSchema);
      expect(result2.content).toBe('plain text');
      expect(result2.structuredOutputs).toBeUndefined();
    });
  });

});