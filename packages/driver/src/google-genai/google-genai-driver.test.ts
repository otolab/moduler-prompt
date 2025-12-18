import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenAIDriver } from './google-genai-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

// Mock @google/genai
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: 'Test response',  // convenience property
            candidates: [{
              finishReason: 'STOP'
            }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 20,
              totalTokenCount: 30
            }
          }),
          generateContentStream: vi.fn().mockResolvedValue({
            [Symbol.asyncIterator]: async function* () {
              yield { text: 'Hello', candidates: [{ finishReason: 'STOP' }] };
              yield { text: ' ', candidates: [{ finishReason: 'STOP' }] };
              yield { text: 'World', candidates: [{ finishReason: 'STOP' }] };
            },
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 20,
              totalTokenCount: 30
            }
          })
        }
      };
    })
  };
});

describe('GoogleGenAIDriver', () => {
  let driver: GoogleGenAIDriver;

  beforeEach(() => {
    driver = new GoogleGenAIDriver({
      apiKey: 'test-api-key',
      model: 'gemini-2.0-flash-exp'
    });
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      // Remove environment variable for this test
      const originalKey = process.env.GOOGLE_GENAI_API_KEY;
      delete process.env.GOOGLE_GENAI_API_KEY;

      expect(() => new GoogleGenAIDriver({})).toThrow(
        'GoogleGenAI API key is required'
      );

      // Restore environment variable
      if (originalKey) {
        process.env.GOOGLE_GENAI_API_KEY = originalKey;
      }
    });

    it('should use environment variable if API key is not in config', () => {
      process.env.GOOGLE_GENAI_API_KEY = 'env-api-key';

      expect(() => new GoogleGenAIDriver({})).not.toThrow();

      delete process.env.GOOGLE_GENAI_API_KEY;
    });

    it('should use default model if not specified', () => {
      const driver = new GoogleGenAIDriver({ apiKey: 'test-key' });
      expect(driver).toBeDefined();
    });
  });

  describe('query', () => {
    it('should execute basic query successfully', async () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'You are a helpful assistant.' }],
        data: [{ type: 'text', content: 'Hello!' }],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBe('Test response');
      expect(result.finishReason).toBe('stop');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
    });

    it('should handle structured output', async () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'Generate JSON' }],
        data: [],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeDefined();
      expect(result.finishReason).toBe('stop');
    });

    it('should handle errors gracefully', async () => {
      const errorDriver = new GoogleGenAIDriver({
        apiKey: 'test-api-key'
      });

      // Mock error
      vi.spyOn(errorDriver['client'].models, 'generateContent').mockRejectedValue(
        new Error('API Error')
      );

      const prompt: CompiledPrompt = {
        instructions: [],
        data: [],
        output: []
      };

      const result = await errorDriver.query(prompt);

      expect(result.content).toBe('');
      expect(result.finishReason).toBe('error');
    });
  });

  describe('streamQuery', () => {
    it('should stream response chunks', async () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'You are a helpful assistant.' }],
        data: [{ type: 'text', content: 'Hello!' }],
        output: []
      };

      const { stream, result } = await driver.streamQuery(prompt);

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' ', 'World']);

      const finalResult = await result;
      expect(finalResult.content).toBe('Hello World');
      expect(finalResult.finishReason).toBe('stop');
    });

    it('should provide final result with usage stats', async () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'text', content: 'Test' }],
        output: []
      };

      const { result } = await driver.streamQuery(prompt);
      const finalResult = await result;

      expect(finalResult.content).toBeDefined();
      expect(finalResult.finishReason).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close without errors', async () => {
      await expect(driver.close()).resolves.not.toThrow();
    });
  });

  describe('finish reason mapping', () => {
    it('should map finish reasons correctly', async () => {
      const testCases = [
        { apiReason: 'STOP', expected: 'stop' },
        { apiReason: 'MAX_TOKENS', expected: 'length' },
        { apiReason: 'SAFETY', expected: 'stop' },
        { apiReason: 'OTHER', expected: 'error' }
      ];

      for (const { apiReason, expected } of testCases) {
        vi.spyOn(driver['client'].models, 'generateContent').mockResolvedValue({
          text: 'Test',  // convenience property
          candidates: [{
            finishReason: apiReason
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30
          }
        });

        const result = await driver.query({
          instructions: [],
          data: [],
          output: []
        });

        expect(result.finishReason).toBe(expected);
      }
    });
  });
});
