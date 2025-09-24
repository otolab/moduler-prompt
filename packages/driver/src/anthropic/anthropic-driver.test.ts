import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicDriver } from './anthropic-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

describe('AnthropicDriver', () => {
  let driver: AnthropicDriver;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new AnthropicDriver({ apiKey: 'test-key' });
    // Get the mock create function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreate = (driver as any).client.messages.create;
  });

  describe('structured outputs', () => {
    it('should add JSON instruction to system prompt when outputSchema is provided', async () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'You are a helpful assistant.' }],
        data: [{ type: 'text', content: 'Analyze this text and return JSON.' }],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              sentiment: { type: 'string' },
              score: { type: 'number' }
            }
          }
        }
      };

      // Mock streaming response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"sentiment":' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '"positive","score":0.8}' } };
          yield { type: 'message_stop' };
        }
      };
      mockCreate.mockResolvedValue(mockStream);

      const result = await driver.query(prompt);

      // Verify the system prompt contains JSON instruction
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('You must respond with valid JSON')
        })
      );

      // Verify structured output is extracted
      expect(result.structuredOutput).toEqual({
        sentiment: 'positive',
        score: 0.8
      });
    });

    it('should extract JSON from markdown code blocks', async () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'text', content: 'Generate JSON' }],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string' }
            }
          }
        }
      };

      // Mock response with markdown code block
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Here is the JSON:\n```json\n' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"status":"success"}' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '\n```' } };
          yield { type: 'message_stop' };
        }
      };
      mockCreate.mockResolvedValue(mockStream);

      const result = await driver.query(prompt);

      expect(result.structuredOutput).toEqual({
        status: 'success'
      });
    });

    it('should return undefined structuredOutput when no schema is provided', async () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'text', content: 'Hello' }],
        output: []
      };

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello there!' } };
          yield { type: 'message_stop' };
        }
      };
      mockCreate.mockResolvedValue(mockStream);

      const result = await driver.query(prompt);

      // Should not add JSON instruction
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: undefined
        })
      );

      expect(result.structuredOutput).toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'text', content: 'Generate something' }],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              data: { type: 'string' }
            }
          }
        }
      };

      // Mock response with invalid JSON
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'This is not JSON' } };
          yield { type: 'message_stop' };
        }
      };
      mockCreate.mockResolvedValue(mockStream);

      const result = await driver.query(prompt);

      expect(result.content).toBe('This is not JSON');
      expect(result.structuredOutput).toBeUndefined();
    });

    it('should work with streamQuery', async () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'text', content: 'Stream JSON' }],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        }
      };

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"id":' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '123,' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '"name":"test"}' } };
          yield { type: 'message_stop' };
        }
      };
      mockCreate.mockResolvedValue(mockStream);

      const { stream, result } = await driver.streamQuery(prompt);

      // Consume stream
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const finalResult = await result;

      expect(chunks.join('')).toBe('{"id":123,"name":"test"}');
      expect(finalResult.structuredOutput).toEqual({
        id: 123,
        name: 'test'
      });
    });
  });
});