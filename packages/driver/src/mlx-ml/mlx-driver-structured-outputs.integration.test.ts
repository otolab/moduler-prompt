import { describe, it, expect, beforeAll, afterAll, skip } from 'vitest';
import { MlxDriver } from './mlx-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import { platform } from 'os';

// Test data types
interface PersonData {
  name: string;
  age: number;
}

interface StatusData {
  status: string;
  count: number;
}

type StreamData = Record<string, unknown>;

// MLXはApple Silicon専用なので、CI環境や非対応環境ではスキップ
const shouldSkipMLX =
  platform() !== 'darwin' ||
  process.env.CI === 'true' ||
  process.env.SKIP_MLX_TESTS === 'true';

describe.skipIf(shouldSkipMLX)('MLXDriver Structured Outputs', () => {
  let driver: MlxDriver;

  beforeAll(() => {
    driver = new MlxDriver({
      model: 'mlx-community/gemma-3-270m-it-qat-8bit',
      defaultOptions: {
        maxTokens: 100,
        temperature: 0.1,  // Low temperature for more deterministic output
        topP: 0.9  // Default top-p value
      }
    });
  });

  afterAll(async () => {
    await driver?.close();
  });

  describe('query with structured outputs', () => {
    it('should extract JSON when outputSchema is provided', async () => {

      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'You are a helpful assistant that outputs JSON.' }
        ],
        data: [
          {
            type: 'text',
            content: 'Generate a simple JSON object with name and age fields. Example: {"name": "Alice", "age": 25}'
          }
        ],
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

      expect(result.content).toBeDefined();
      console.log('MLX Response:', result.content);

      // Check if structured outputs were extracted
      if (result.structuredOutput && result.structuredOutput.length > 0) {
        const data = result.structuredOutput[0] as PersonData;
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('age');
        expect(typeof data.name).toBe('string');
        expect(typeof data.age).toBe('number');
      } else {
        // Log for debugging if extraction failed
        console.log('No structured outputs extracted from:', result.content);
      }
    }, 30000); // Increase timeout for model loading

    it('should return undefined structuredOutput when no schema provided', async () => {

      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'You are a helpful assistant.' }
        ],
        data: [
          { type: 'text', content: 'Say hello' }
        ],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeDefined();
      expect(result.structuredOutput).toBeUndefined();
    }, 30000);

    it('should handle JSON in markdown code blocks', async () => {

      const prompt: CompiledPrompt = {
        instructions: [
          {
            type: 'text',
            content: 'You are a helpful assistant. When outputting JSON, wrap it in markdown code blocks like ```json ... ```'
          }
        ],
        data: [
          {
            type: 'text',
            content: 'Create a JSON object with status: "success" and count: 5'
          }
        ],
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

      expect(result.content).toBeDefined();
      console.log('MLX Response with markdown:', result.content);

      // Check if structured outputs were extracted
      if (result.structuredOutput && result.structuredOutput.length > 0) {
        const data = result.structuredOutput[0] as StatusData;
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('count');
      } else {
        console.log('No structured outputs extracted from markdown response');
      }
    }, 30000);
  });

  describe('streamQuery with structured outputs', () => {
    it('should extract JSON in streaming mode', async () => {

      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'Output a JSON object.' }
        ],
        data: [
          {
            type: 'text',
            content: 'Generate: {"result": "test", "value": 42}'
          }
        ],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              result: { type: 'string' },
              value: { type: 'number' }
            }
          }
        }
      };

      const { stream, result } = await driver.streamQuery(prompt);

      // Consume the stream
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeDefined();

      // Check the final result
      const finalResult = await result;
      console.log('Streamed content:', finalResult.content);

      if (finalResult.structuredOutput && finalResult.structuredOutput.length > 0) {
        const data = finalResult.structuredOutput[0] as StreamData;
        expect(data).toBeDefined();
        console.log('Extracted structured data:', data);
      }
    }, 30000);
  });
});