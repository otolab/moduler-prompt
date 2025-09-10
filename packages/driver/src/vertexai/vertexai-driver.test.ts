import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VertexAIDriver } from './vertexai-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';

// Mock @google-cloud/vertexai module
vi.mock('@google-cloud/vertexai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      candidates: [{
        content: {
          parts: [{ text: 'Mocked Vertex AI response' }],
          role: 'model'
        },
        finishReason: 'STOP'
      }],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 8,
        totalTokenCount: 23
      }
    }
  });
  
  const mockGenerateContentStream = vi.fn().mockResolvedValue({
    stream: (async function* () {
      yield {
        candidates: [{
          content: {
            parts: [{ text: 'Streaming ' }]
          }
        }]
      };
      yield {
        candidates: [{
          content: {
            parts: [{ text: 'response' }]
          }
        }]
      };
    })()
  });
  
  return {
    VertexAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream
      }),
      preview: {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
          generateContentStream: mockGenerateContentStream
        })
      }
    })),
    HarmCategory: {
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    SchemaType: {
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT'
    }
  };
});

describe('VertexAIDriver', () => {
  let driver: VertexAIDriver;
  
  beforeEach(() => {
    // Set environment variable for project
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    
    driver = new VertexAIDriver({
      project: 'test-project',
      location: 'us-central1',
      model: 'gemini-2.0-flash-001'
    });
  });
  
  it('should initialize with config', () => {
    expect(driver).toBeDefined();
    expect(driver.preferMessageFormat).toBe(true);
  });
  
  it('should throw error if project is not provided', () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    
    expect(() => new VertexAIDriver({
      location: 'us-central1'
    })).toThrow('VertexAI project ID is required');
  });
  
  it('should query with a compiled prompt', async () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'You are a helpful assistant' }
      ],
      data: [
        { type: 'text', content: 'User data here' }
      ],
      output: []
    };
    
    const result = await driver.query(prompt);
    
    expect(result.content).toBe('Mocked Vertex AI response');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 15,
      completionTokens: 8,
      totalTokens: 23
    });
  });
  
  it('should handle query options', async () => {
    const prompt: CompiledPrompt = {
      instructions: [],
      data: [
        { type: 'text', content: 'Process this data' }
      ],
      output: []
    };
    
    const result = await driver.query(prompt, {
      temperature: 0.8,
      maxTokens: 500,
      topP: 0.95,
      topK: 40
    });
    
    expect(result.content).toBe('Mocked Vertex AI response');
  });
  
  it('should handle streaming', async () => {
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
    
    expect(chunks).toEqual(['Streaming ', 'response']);
  });
  
  it('should handle errors gracefully', async () => {
    // Create a driver that will throw an error
    const VertexAI = (await import('@google-cloud/vertexai')).VertexAI as unknown as ReturnType<typeof vi.fn>;
    VertexAI.mockImplementationOnce(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
      })
    }));
    
    const errorDriver = new VertexAIDriver({
      project: 'test-project'
    });
    
    const prompt: CompiledPrompt = {
      instructions: [{ type: 'text', content: 'Test' }],
      data: [],
      output: []
    };
    
    const result = await errorDriver.query(prompt);
    
    expect(result.content).toBe('');
    expect(result.finishReason).toBe('error');
  });
  
  it('should handle JSON response format', async () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Return JSON' }
      ],
      data: [],
      output: []
    };
    
    const result = await driver.query(prompt, {
      responseFormat: 'json',
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      }
    });
    
    expect(result.content).toBe('Mocked Vertex AI response');
  });
});