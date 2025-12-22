import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GoogleGenAIDriver } from './google-genai-driver.js';
import type { CompiledPrompt } from '@modular-prompt/core';

// Skip if API key is not available
const shouldSkip = !process.env.GOOGLE_GENAI_API_KEY;

describe.skipIf(shouldSkip)('GoogleGenAIDriver Integration', () => {
  let driver: GoogleGenAIDriver;

  beforeAll(() => {
    driver = new GoogleGenAIDriver({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      model: 'gemma-3-27b',
      temperature: 0.1
    });
  });

  afterAll(async () => {
    await driver?.close();
  });

  describe('basic query', () => {
    it('should convert instructions to systemInstruction (Part[])', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'You are a helpful assistant.' },
          { type: 'text', content: 'Always be concise.' }
        ],
        data: [
          { type: 'text', content: 'Say "Hello, World!" and nothing else.' }
        ],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeTruthy();
      expect(result.finishReason).toBe('stop');
      expect(result.content.toLowerCase()).toContain('hello');
    }, 30000);
  });

  describe('query with MessageElement', () => {
    it('should convert MessageElements to Content[] with roles', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'You are a helpful assistant.' }
        ],
        data: [
          { type: 'message', role: 'user', content: 'What is 2+2?' },
          { type: 'message', role: 'assistant', content: '4' },
          { type: 'message', role: 'user', content: 'What is 3+3?' }
        ],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeTruthy();
      expect(result.finishReason).toBe('stop');
      expect(result.content).toContain('6');
    }, 30000);
  });

  describe('query with Material and Chunk elements', () => {
    it('should convert Material to Content without role', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'Summarize the provided material in one sentence.' }
        ],
        data: [
          {
            type: 'material',
            id: 'doc1',
            title: 'Sample Document',
            content: 'TypeScript is a typed superset of JavaScript.'
          }
        ],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeTruthy();
      expect(result.finishReason).toBe('stop');
      expect(result.content.toLowerCase()).toMatch(/typescript|javascript/);
    }, 30000);

    it('should convert Chunk to Content without role', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'What programming language is mentioned?' }
        ],
        data: [
          {
            type: 'chunk',
            partOf: 'programming-guide',
            index: 0,
            total: 2,
            content: 'Python is a high-level programming language.'
          }
        ],
        output: []
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeTruthy();
      expect(result.finishReason).toBe('stop');
      expect(result.content.toLowerCase()).toContain('python');
    }, 30000);
  });

  describe('streamQuery', () => {
    it('should stream response chunks', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'You are a helpful assistant.' }
        ],
        data: [
          { type: 'text', content: 'Count from 1 to 5.' }
        ],
        output: []
      };

      const { stream, result } = await driver.streamQuery(prompt);

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullText = chunks.join('');
      expect(fullText).toBeTruthy();

      const finalResult = await result;
      expect(finalResult.content).toBe(fullText);
      expect(finalResult.finishReason).toBe('stop');
    }, 30000);
  });

  describe('structured output', () => {
    it('should return structured JSON when schema is provided', async () => {
      const prompt: CompiledPrompt = {
        instructions: [
          { type: 'text', content: 'Extract the person\'s name and age from the text.' }
        ],
        data: [
          { type: 'text', content: 'John is 25 years old.' }
        ],
        output: [],
        metadata: {
          outputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            },
            required: ['name', 'age']
          }
        }
      };

      const result = await driver.query(prompt);

      expect(result.content).toBeTruthy();
      expect(result.structuredOutput).toBeDefined();

      if (result.structuredOutput) {
        const data = result.structuredOutput as { name: string; age: number };
        expect(data.name.toLowerCase()).toContain('john');
        expect(data.age).toBe(25);
      }
    }, 30000);
  });
});
