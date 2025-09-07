import { describe, it, expect } from 'vitest';
import { EchoDriver } from './echo-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

describe('EchoDriver', () => {
  const samplePrompt: CompiledPrompt = {
    instructions: [
      { type: 'text', content: 'You are a helpful assistant.' },
      {
        type: 'section',
        title: 'Guidelines',
        items: ['Be concise', 'Be accurate']
      }
    ],
    data: [
      { type: 'text', content: 'User input data' },
      {
        type: 'material',
        id: 'doc-1',
        title: 'Reference',
        content: 'Reference material'
      }
    ],
    output: [
      { type: 'text', content: 'Generate a response' }
    ]
  };
  
  describe('text format', () => {
    it('should echo back formatted text', async () => {
      const driver = new EchoDriver({ format: 'text' });
      const result = await driver.query(samplePrompt);
      
      expect(result.content).toContain('# Instructions');
      expect(result.content).toContain('You are a helpful assistant.');
      expect(result.content).toContain('## Guidelines');
      expect(result.content).toContain('- Be concise');
      expect(result.content).toContain('# Data');
      expect(result.content).toContain('User input data');
      expect(result.content).toContain('### Reference');
      expect(result.content).toContain('# Output');
      expect(result.content).toContain('Generate a response');
      expect(result.finishReason).toBe('stop');
    });
    
    it('should include metadata when requested', async () => {
      const driver = new EchoDriver({ 
        format: 'text', 
        includeMetadata: true 
      });
      const result = await driver.query(samplePrompt);
      
      expect(result.content).toContain('=== METADATA ===');
      expect(result.content).toContain('=== CONTENT ===');
      expect(result.content).toContain('"format": "text"');
    });
  });
  
  describe('messages format', () => {
    it('should echo back formatted messages as JSON', async () => {
      const driver = new EchoDriver({ format: 'messages' });
      const result = await driver.query(samplePrompt);
      
      const messages = JSON.parse(result.content);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      
      // Check for section headers
      const contents = messages.map((m: any) => m.content);
      expect(contents).toContain('# Instructions');
      expect(contents).toContain('# Data');
      expect(contents).toContain('# Output');
    });
  });
  
  describe('raw format', () => {
    it('should echo back raw compiled prompt as JSON', async () => {
      const driver = new EchoDriver({ format: 'raw' });
      const result = await driver.query(samplePrompt);
      
      const raw = JSON.parse(result.content);
      expect(raw.instructions).toEqual(samplePrompt.instructions);
      expect(raw.data).toEqual(samplePrompt.data);
      expect(raw.output).toEqual(samplePrompt.output);
    });
  });
  
  describe('both format', () => {
    it('should echo back both text and messages', async () => {
      const driver = new EchoDriver({ format: 'both' });
      const result = await driver.query(samplePrompt);
      
      const both = JSON.parse(result.content);
      expect(both.text).toBeDefined();
      expect(both.messages).toBeDefined();
      expect(typeof both.text).toBe('string');
      expect(Array.isArray(both.messages)).toBe(true);
      
      expect(both.text).toContain('# Instructions');
      expect(both.messages.length).toBeGreaterThan(0);
    });
  });
  
  describe('debug format', () => {
    it('should echo back detailed debug information', async () => {
      const driver = new EchoDriver({ format: 'debug' });
      const result = await driver.query(samplePrompt, {
        temperature: 0.7,
        maxTokens: 100
      });
      
      const debug = JSON.parse(result.content);
      expect(debug.raw).toBeDefined();
      expect(debug.formatted).toBeDefined();
      expect(debug.formatted.text).toBeDefined();
      expect(debug.formatted.messages).toBeDefined();
      expect(debug.metadata).toBeDefined();
      expect(debug.metadata.instructionsCount).toBe(2);
      expect(debug.metadata.dataCount).toBe(2);
      expect(debug.metadata.outputCount).toBe(1);
      expect(debug.metadata.queryOptions.temperature).toBe(0.7);
      expect(debug.metadata.queryOptions.maxTokens).toBe(100);
    });
  });
  
  describe('usage simulation', () => {
    it('should simulate usage statistics', async () => {
      const driver = new EchoDriver({ 
        format: 'text',
        simulateUsage: true 
      });
      const result = await driver.query(samplePrompt);
      
      expect(result.usage).toBeDefined();
      expect(result.usage?.promptTokens).toBeGreaterThan(0);
      expect(result.usage?.completionTokens).toBe(0);
      expect(result.usage?.totalTokens).toBe(result.usage?.promptTokens);
    });
    
    it('should not include usage when disabled', async () => {
      const driver = new EchoDriver({ 
        format: 'text',
        simulateUsage: false 
      });
      const result = await driver.query(samplePrompt);
      
      expect(result.usage).toBeUndefined();
    });
  });
  
  describe('streaming', () => {
    it('should stream content in chunks', async () => {
      const driver = new EchoDriver({ 
        format: 'text',
        streamChunkSize: 50
      });
      
      const chunks: string[] = [];
      for await (const chunk of driver.streamQuery(samplePrompt)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Reconstruct content from chunks
      const fullContent = chunks.join('');
      expect(fullContent).toContain('# Instructions');
      expect(fullContent).toContain('# Data');
      expect(fullContent).toContain('# Output');
    });
  });
  
  describe('custom formatter options', () => {
    it('should use custom formatter options', async () => {
      const driver = new EchoDriver({
        format: 'text',
        formatterOptions: {
          preamble: 'CUSTOM PREAMBLE',
          sectionDescriptions: {
            instructions: 'CUSTOM INSTRUCTIONS DESC'
          }
        }
      });
      
      const result = await driver.query(samplePrompt);
      
      expect(result.content).toContain('CUSTOM PREAMBLE');
      expect(result.content).toContain('CUSTOM INSTRUCTIONS DESC');
    });
  });
});