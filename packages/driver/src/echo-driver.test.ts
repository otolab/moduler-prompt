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
      
      const { stream, result } = await driver.streamQuery(samplePrompt);

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);

      // Reconstruct content from chunks
      const fullContent = chunks.join('');
      expect(fullContent).toContain('# Instructions');
      expect(fullContent).toContain('# Data');
      expect(fullContent).toContain('# Output');

      // Verify result promise
      const finalResult = await result;
      expect(finalResult.content).toBe(fullContent);
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

  describe('structured outputs', () => {
    it('extracts JSON from raw format when outputSchema is provided', async () => {
      const driver = new EchoDriver({ format: 'raw' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              instructions: { type: 'array' },
              data: { type: 'array' }
            }
          }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Raw format returns the prompt as JSON
      expect(result.structuredOutputs).toBeDefined();
      expect(result.structuredOutputs).toHaveLength(1);
      expect(result.structuredOutputs![0]).toHaveProperty('instructions');
      expect(result.structuredOutputs![0]).toHaveProperty('data');
    });

    it('extracts JSON from messages format when outputSchema is provided', async () => {
      const driver = new EchoDriver({ format: 'messages' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Messages format returns an array of messages as JSON
      expect(result.structuredOutputs).toBeDefined();
      expect(result.structuredOutputs).toHaveLength(1);
      expect(Array.isArray(result.structuredOutputs![0])).toBe(true);
    });

    it('extracts JSON from both format when outputSchema is provided', async () => {
      const driver = new EchoDriver({ format: 'both' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              messages: { type: 'array' }
            }
          }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Both format returns an object with text and messages
      expect(result.structuredOutputs).toBeDefined();
      expect(result.structuredOutputs).toHaveLength(1);
      expect(result.structuredOutputs![0]).toHaveProperty('text');
      expect(result.structuredOutputs![0]).toHaveProperty('messages');
    });

    it('extracts JSON from debug format when outputSchema is provided', async () => {
      const driver = new EchoDriver({ format: 'debug' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              raw: { type: 'object' },
              formatted: { type: 'object' },
              metadata: { type: 'object' }
            }
          }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Debug format returns detailed debug info as JSON
      expect(result.structuredOutputs).toBeDefined();
      expect(result.structuredOutputs).toHaveLength(1);
      expect(result.structuredOutputs![0]).toHaveProperty('raw');
      expect(result.structuredOutputs![0]).toHaveProperty('formatted');
      expect(result.structuredOutputs![0]).toHaveProperty('metadata');
    });

    it('returns undefined structuredOutputs for text format', async () => {
      const driver = new EchoDriver({ format: 'text' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: { type: 'object' }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Text format doesn't contain JSON, so no structured output
      expect(result.structuredOutputs).toBeUndefined();
    });

    it('returns undefined structuredOutputs when no schema provided', async () => {
      const driver = new EchoDriver({ format: 'raw' });

      const result = await driver.query(samplePrompt);

      // No schema means no structured outputs
      expect(result.structuredOutputs).toBeUndefined();
    });

    it('handles structured outputs in streamQuery', async () => {
      const driver = new EchoDriver({ format: 'both' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              messages: { type: 'array' }
            }
          }
        }
      };

      const { result } = await driver.streamQuery(promptWithSchema);
      const queryResult = await result;

      expect(queryResult.structuredOutputs).toBeDefined();
      expect(queryResult.structuredOutputs).toHaveLength(1);
      expect(queryResult.structuredOutputs![0]).toHaveProperty('text');
      expect(queryResult.structuredOutputs![0]).toHaveProperty('messages');
    });

    it('handles metadata inclusion with structured outputs', async () => {
      const driver = new EchoDriver({
        format: 'raw',
        includeMetadata: true
      });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: { type: 'object' }
        }
      };

      const result = await driver.query(promptWithSchema);

      // With metadata, content has metadata wrapper but JSON extraction should still work
      expect(result.content).toContain('=== METADATA ===');
      expect(result.content).toContain('=== CONTENT ===');

      // JSON extraction should find the JSON in the CONTENT section
      expect(result.structuredOutputs).toBeDefined();
    });
  });
});