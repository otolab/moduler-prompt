import { describe, it, expect, vi } from 'vitest';
import { BaseDriver } from './base-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { QueryOptions, QueryResult } from '../types.js';

// Mock implementation for testing
class MockDriver extends BaseDriver {
  async queryWithText(text: string, options?: QueryOptions): Promise<QueryResult> {
    return {
      content: `Response to: ${text}`,
      finishReason: 'stop'
    };
  }
}

describe('BaseDriver', () => {
  it('should format prompt as text by default', async () => {
    const driver = new MockDriver();
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Test instruction' }
      ],
      data: [],
      output: []
    };
    
    const result = await driver.query(prompt);
    expect(result.content).toContain('Response to:');
    expect(result.content).toContain('Test instruction');
    expect(result.finishReason).toBe('stop');
  });
  
  it('should format prompt as messages when preferMessageFormat is true', async () => {
    class MessageMockDriver extends BaseDriver {
      preferMessageFormat = true;
      
      async queryWithMessages(messages: any[], options?: QueryOptions): Promise<QueryResult> {
        return {
          content: `Messages: ${messages.length}`,
          finishReason: 'stop'
        };
      }
    }
    
    const driver = new MessageMockDriver();
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Test' }
      ],
      data: [],
      output: []
    };
    
    const result = await driver.query(prompt);
    expect(result.content).toBe('Messages: 2'); // Section header + content
  });
  
  it('should use custom formatter options', () => {
    const formatterOptions = {
      preamble: 'Custom preamble',
      lineBreak: '\r\n'
    };
    
    const driver = new MockDriver(formatterOptions);
    const options = driver.getFormatterOptions();
    
    expect(options.preamble).toBe('Custom preamble');
    expect(options.lineBreak).toBe('\r\n');
  });
  
  it('should implement streamQuery as non-streaming by default', async () => {
    const driver = new MockDriver();
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Stream test' }
      ],
      data: [],
      output: []
    };
    
    const chunks: string[] = [];
    for await (const chunk of driver.streamQuery(prompt)) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain('Response to:');
    expect(chunks[0]).toContain('Stream test');
  });
  
  it('should have a no-op close by default', async () => {
    const driver = new MockDriver();
    await expect(driver.close()).resolves.toBeUndefined();
  });
});