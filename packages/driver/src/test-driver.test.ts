import { describe, it, expect, beforeEach } from 'vitest';
import { TestDriver } from './test-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

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
      
      expect(await driver.query(prompt)).toBe('First');
      expect(await driver.query(prompt)).toBe('Second');
      expect(await driver.query(prompt)).toBe('Third');
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
      expect(result).toBe('Test response');
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
      
      const chars: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
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
      
      const chars1: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
        chars1.push(char);
      }
      expect(chars1.join('')).toBe('Hi');
      
      const chars2: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
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
      
      const iterator = driver.streamQuery(prompt);
      await expect(iterator.next()).rejects.toThrow('No more responses available');
    });
  });
  
  describe('response provider function', () => {
    it('uses response provider function', async () => {
      let callCount = 0;
      const driver = new TestDriver({
        responses: (prompt) => {
          callCount++;
          return `Response ${callCount}`;
        }
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      expect(await driver.query(prompt)).toBe('Response 1');
      expect(await driver.query(prompt)).toBe('Response 2');
      expect(await driver.query(prompt)).toBe('Response 3');
    });
    
    it('uses async response provider function', async () => {
      const driver = new TestDriver({
        responses: async (prompt) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'Async response';
        }
      });
      
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };
      
      expect(await driver.query(prompt)).toBe('Async response');
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
      
      const chars: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
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
});