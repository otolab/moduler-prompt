import { describe, it, expect, beforeEach } from 'vitest';
import { TestDriver } from './test-driver.js';
import type { Element } from '@moduler-prompt/core';

describe('TestDriver', () => {
  let driver: TestDriver;
  
  beforeEach(() => {
    driver = new TestDriver();
  });
  
  describe('query', () => {
    it('returns default response', async () => {
      const result = await driver.query('test prompt');
      expect(result).toBe('Test response');
    });
    
    it('returns configured responses in order', async () => {
      driver = new TestDriver({
        responses: ['First', 'Second', 'Third']
      });
      
      expect(await driver.query('prompt 1')).toBe('First');
      expect(await driver.query('prompt 2')).toBe('Second');
      expect(await driver.query('prompt 3')).toBe('Third');
      expect(await driver.query('prompt 4')).toBe('Test response');
    });
    
    it('records query history', async () => {
      await driver.query('test prompt', { temperature: 0.7 });
      
      const lastQuery = driver.getLastQuery();
      expect(lastQuery?.prompt).toBe('test prompt');
      expect(lastQuery?.options?.temperature).toBe(0.7);
    });
    
    it('handles Element array input', async () => {
      const elements: Element[] = [
        { type: 'text', content: 'Hello' },
        { type: 'text', content: 'World' }
      ];
      
      const result = await driver.query(elements);
      expect(result).toBe('Test response');
      
      const lastQuery = driver.getLastQuery();
      expect(lastQuery?.prompt).toContain('Hello');
      expect(lastQuery?.prompt).toContain('World');
    });
    
    it('simulates delay', async () => {
      driver = new TestDriver({ delay: 100 });
      
      const start = Date.now();
      await driver.query('test');
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(90);
    });
    
    it('throws error when configured', async () => {
      driver = new TestDriver({
        throwError: true,
        errorMessage: 'Custom error'
      });
      
      await expect(driver.query('test')).rejects.toThrow('Custom error');
    });
  });
  
  describe('chat', () => {
    it('returns chat result with usage', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' }
      ];
      
      const result = await driver.chat(messages);
      
      expect(result.content).toBe('Test response');
      expect(result.usage).toBeDefined();
      expect(result.usage?.totalTokens).toBe(150);
      expect(result.finishReason).toBe('stop');
    });
    
    it('records chat history', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' }
      ];
      
      await driver.chat(messages, { maxTokens: 100 });
      
      const lastChat = driver.getLastChat();
      expect(lastChat?.messages).toEqual(messages);
      expect(lastChat?.options?.maxTokens).toBe(100);
    });
  });
  
  describe('streamQuery', () => {
    it('streams response character by character', async () => {
      driver = new TestDriver({
        responses: ['Hello']
      });
      
      const chars: string[] = [];
      for await (const char of driver.streamQuery('test')) {
        chars.push(char);
      }
      
      expect(chars.join('')).toBe('Hello');
      expect(chars).toEqual(['H', 'e', 'l', 'l', 'o']);
    });
  });
  
  describe('utility methods', () => {
    it('resets state', async () => {
      await driver.query('test1');
      await driver.query('test2');
      
      expect(driver.queryHistory).toHaveLength(2);
      
      driver.reset();
      
      expect(driver.queryHistory).toHaveLength(0);
    });
    
    it('sets new responses', async () => {
      driver.setResponses(['New response']);
      
      const result = await driver.query('test');
      expect(result).toBe('New response');
    });
    
    it('closes and resets', async () => {
      await driver.query('test');
      await driver.close();
      
      expect(driver.queryHistory).toHaveLength(0);
    });
  });
});