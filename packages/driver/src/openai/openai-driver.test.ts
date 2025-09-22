import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIDriver } from './openai-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation((params) => {
            if (params.stream) {
              // Return an async iterable for streaming
              return (async function* () {
                yield {
                  choices: [{
                    delta: { content: 'Mocked' },
                    finish_reason: null
                  }]
                };
                yield {
                  choices: [{
                    delta: { content: ' response' },
                    finish_reason: 'stop'
                  }],
                  usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                  }
                };
              })();
            } else {
              // Return a promise for non-streaming
              return Promise.resolve({
                choices: [{
                  message: { content: 'Mocked response' },
                  finish_reason: 'stop'
                }],
                usage: {
                  prompt_tokens: 10,
                  completion_tokens: 5,
                  total_tokens: 15
                }
              });
            }
          })
        }
      }
    }))
  };
});

describe('OpenAIDriver', () => {
  let driver: OpenAIDriver;
  
  beforeEach(() => {
    driver = new OpenAIDriver({
      apiKey: 'test-key',
      model: 'gpt-4o-mini'
    });
  });
  
  it('should initialize with config', () => {
    expect(driver).toBeDefined();
  });
  
  it('should query with a compiled prompt', async () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Test instruction' }
      ],
      data: [],
      output: []
    };
    
    const result = await driver.query(prompt);
    
    expect(result.content).toBe('Mocked response');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15
    });
  });
  
  it('should handle query options', async () => {
    const prompt: CompiledPrompt = {
      instructions: [],
      data: [
        { type: 'text', content: 'Some data' }
      ],
      output: []
    };
    
    const result = await driver.query(prompt, {
      temperature: 0.7,
      maxTokens: 100
    });
    
    expect(result.content).toBe('Mocked response');
  });
  
  it('should handle errors gracefully', async () => {
    // Create a driver that will throw an error
    const OpenAI = (await import('openai')).default as unknown as ReturnType<typeof vi.fn>;
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation((params) => {
            if (params.stream) {
              // Return an async iterable that throws
              return (async function* () {
                yield; // Add yield to satisfy generator requirement
                throw new Error('API Error');
              })();
            } else {
              return Promise.reject(new Error('API Error'));
            }
          })
        }
      }
    }));

    const errorDriver = new OpenAIDriver({ apiKey: 'test-key' });
    const prompt: CompiledPrompt = {
      instructions: [{ type: 'text', content: 'Test' }],
      data: [],
      output: []
    };

    const result = await errorDriver.query(prompt);

    expect(result.content).toBe('');
    expect(result.finishReason).toBe('error');
  });
});