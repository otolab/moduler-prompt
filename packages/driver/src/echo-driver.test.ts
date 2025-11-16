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
      expect(result.content).toContain('Be concise');
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
      
      // Check for section headers (with descriptions)
      const contents = messages.map((m: any) => m.content);
      expect(contents.some(c => c.includes('# Instructions'))).toBe(true);
      expect(contents.some(c => c.includes('# Data'))).toBe(true);
      expect(contents.some(c => c.includes('# Output'))).toBe(true);
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
      expect(result.structuredOutput).toBeDefined();
      expect(result.structuredOutput).toHaveProperty('instructions');
      expect(result.structuredOutput).toHaveProperty('data');
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
      expect(result.structuredOutput).toBeDefined();
      expect(Array.isArray(result.structuredOutput)).toBe(true);
      expect((result.structuredOutput as any[]).length).toBeGreaterThan(0);
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
      expect(result.structuredOutput).toBeDefined();
      expect(result.structuredOutput).toHaveProperty('text');
      expect(result.structuredOutput).toHaveProperty('messages');
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
      expect(result.structuredOutput).toBeDefined();
      expect(result.structuredOutput).toHaveProperty('raw');
      expect(result.structuredOutput).toHaveProperty('formatted');
      expect(result.structuredOutput).toHaveProperty('metadata');
    });

    it('returns undefined structuredOutput for text format', async () => {
      const driver = new EchoDriver({ format: 'text' });
      const promptWithSchema: CompiledPrompt = {
        ...samplePrompt,
        metadata: {
          outputSchema: { type: 'object' }
        }
      };

      const result = await driver.query(promptWithSchema);

      // Text format doesn't contain JSON, so no structured output
      expect(result.structuredOutput).toBeUndefined();
    });

    it('returns undefined structuredOutput when no schema provided', async () => {
      const driver = new EchoDriver({ format: 'raw' });

      const result = await driver.query(samplePrompt);

      // No schema means no structured outputs
      expect(result.structuredOutput).toBeUndefined();
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

      expect(queryResult.structuredOutput).toBeDefined();
      expect(queryResult.structuredOutput).toHaveProperty('text');
      expect(queryResult.structuredOutput).toHaveProperty('messages');
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
      expect(result.structuredOutput).toBeDefined();
    });

    describe('edge cases and performance', () => {
      it('handles structured outputs with custom formatter options', async () => {
        const driver = new EchoDriver({
          format: 'raw',
          formatterOptions: {
            preamble: 'CUSTOM PREAMBLE',
            markers: {
              materialStart: '<<<',
              materialEnd: '>>>'
            }
          }
        });

        const promptWithSchema: CompiledPrompt = {
          ...samplePrompt,
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const result = await driver.query(promptWithSchema);
        // Raw format still returns JSON regardless of formatter options
        expect(result.structuredOutput).toBeDefined();
        expect(result.structuredOutput).toHaveProperty('instructions');
      });

      it('combines simulateUsage with structured outputs', async () => {
        const driver = new EchoDriver({
          format: 'raw',
          simulateUsage: true
        });

        const promptWithSchema: CompiledPrompt = {
          ...samplePrompt,
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const result = await driver.query(promptWithSchema);
        expect(result.structuredOutput).toBeDefined();
        expect(result.usage).toBeDefined();
        expect(result.usage?.promptTokens).toBeGreaterThan(0);
      });

      it('handles empty prompt gracefully', async () => {
        const driver = new EchoDriver({ format: 'raw' });
        const emptyPrompt: CompiledPrompt = {
          instructions: [],
          data: [],
          output: [],
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const result = await driver.query(emptyPrompt);
        // Raw format returns the entire CompiledPrompt as JSON, including metadata
        expect(result.structuredOutput).toHaveProperty('instructions');
        expect(result.structuredOutput).toHaveProperty('data');
        expect(result.structuredOutput).toHaveProperty('output');
        expect((result.structuredOutput as any).instructions).toEqual([]);
        expect((result.structuredOutput as any).data).toEqual([]);
        expect((result.structuredOutput as any).output).toEqual([]);
      });

      it('handles very large prompts', async () => {
        const largeArray = Array(1000).fill(null).map((_, i) => ({
          type: 'text' as const,
          content: `Item ${i}: ${'x'.repeat(100)}`
        }));

        const driver = new EchoDriver({ format: 'raw' });
        const largePrompt: CompiledPrompt = {
          instructions: largeArray,
          data: [],
          output: [],
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const result = await driver.query(largePrompt);
        expect(result.structuredOutput).toBeDefined();
        expect((result.structuredOutput as any).instructions).toHaveLength(1000);
      });

      it('handles different stream chunk sizes', async () => {
        const driver1 = new EchoDriver({
          format: 'both',
          streamChunkSize: 10
        });
        const driver2 = new EchoDriver({
          format: 'both',
          streamChunkSize: 1000
        });

        const promptWithSchema: CompiledPrompt = {
          ...samplePrompt,
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const { stream: stream1, result: result1 } = await driver1.streamQuery(promptWithSchema);
        const { stream: stream2, result: result2 } = await driver2.streamQuery(promptWithSchema);

        const chunks1: string[] = [];
        const chunks2: string[] = [];

        for await (const chunk of stream1) {
          chunks1.push(chunk);
        }
        for await (const chunk of stream2) {
          chunks2.push(chunk);
        }

        // Different chunk sizes should produce different chunk counts
        expect(chunks1.length).toBeGreaterThan(chunks2.length);

        // But final results should be the same
        const final1 = await result1;
        const final2 = await result2;
        expect(final1.structuredOutput).toEqual(final2.structuredOutput);
      });

      it('handles complex nested prompt structures', async () => {
        const driver = new EchoDriver({ format: 'raw' });
        const complexPrompt: CompiledPrompt = {
          instructions: [
            { type: 'text', content: 'Text instruction' },
            {
              type: 'section',
              title: 'Section 1',
              items: [
                'Item 1',
                {
                  type: 'subsection',
                  title: 'Subsection',
                  items: ['Sub item 1', 'Sub item 2']
                }
              ]
            }
          ],
          data: [
            {
              type: 'material',
              id: 'mat-1',
              title: 'Material',
              content: 'Content'
            },
            {
              type: 'chunk',
              content: 'Chunk data',
              partOf: 'dataset',
              index: 0
            }
          ],
          output: [
            { type: 'text', content: 'Output instruction' }
          ],
          metadata: {
            outputSchema: { type: 'object' }
          }
        };

        const result = await driver.query(complexPrompt);
        expect(result.structuredOutput).toBeDefined();
        const output = result.structuredOutput as any;
        expect(output.instructions).toHaveLength(2);
        expect(output.data).toHaveLength(2);
        expect(output.output).toHaveLength(1);
      });
    });
  });
});