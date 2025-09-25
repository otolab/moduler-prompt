import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MlxDriver } from './mlx-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import { Readable } from 'stream';

// Mock the formatter
vi.mock('../formatter/converter.js', () => ({
  formatPromptAsMessages: vi.fn().mockReturnValue([
    { role: 'user', content: 'test message' }
  ])
}));

// Mock the MlxProcess
const mockChat = vi.fn();
const mockCompletion = vi.fn();
const mockGetSpecManager = vi.fn();

vi.mock('./process/index.js', () => ({
  MlxProcess: vi.fn().mockImplementation(() => ({
    getCapabilities: vi.fn().mockResolvedValue({
      methods: ['chat', 'completion'],
      special_tokens: {},
      features: {
        apply_chat_template: true,
        supports_completion: true
      }
    }),
    chat: mockChat,
    completion: mockCompletion,
    exit: vi.fn(),
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
    getSpecManager: mockGetSpecManager,
    getStatus: vi.fn().mockReturnValue({ modelSpec: true }),
    initialize: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock model-specific processor
vi.mock('./process/model-specific.js', () => ({
  createModelSpecificProcessor: vi.fn().mockReturnValue({
    applyModelSpecificProcessing: (messages: unknown) => messages,
    applyCompletionSpecificProcessing: (prompt: string) => prompt,
    applyChatSpecificProcessing: (messages: unknown) => messages,
    formatCompletionPrompt: vi.fn().mockResolvedValue('formatted prompt')
  })
}));

describe('MlxDriver - MessageElement based API selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock spec manager
    mockGetSpecManager.mockReturnValue({
      preprocessMessages: (messages: unknown) => messages,
      determineApi: vi.fn().mockImplementation((prompt: CompiledPrompt) => {
        // Check if there are any MessageElements in the prompt
        const hasMessageElement = [
          ...prompt.instructions,
          ...prompt.data,
          ...prompt.output
        ].some(element => element.type === 'message');

        return hasMessageElement ? 'chat' : 'completion';
      }),
      canUseChat: vi.fn().mockReturnValue(true),
      canUseCompletion: vi.fn().mockReturnValue(true),
      generatePrompt: () => 'generated prompt'
    });

    // Setup mock streams
    const createMockStream = (content: string) => {
      const stream = new Readable({
        read() {
          this.push(content);
          this.push(null);
        }
      });
      return stream;
    };

    mockChat.mockImplementation(() => Promise.resolve(createMockStream('chat response')));
    mockCompletion.mockImplementation(() => Promise.resolve(createMockStream('completion response')));
  });

  it('should use chat API when MessageElement is present', async () => {
    const driver = new MlxDriver({
      model: 'test-model'
    });

    const promptWithMessageElement: CompiledPrompt = {
      instructions: [
        {
          type: 'message',
          role: 'system',
          content: 'You are a helpful assistant'
        }
      ],
      data: [],
      output: []
    };

    const result = await driver.query(promptWithMessageElement);

    expect(mockChat).toHaveBeenCalled();
    expect(mockCompletion).not.toHaveBeenCalled();
    expect(result.content).toBe('chat response');
  });

  it('should use completion API when no MessageElement is present', async () => {
    const driver = new MlxDriver({
      model: 'test-model'
    });

    const promptWithoutMessageElement: CompiledPrompt = {
      instructions: [
        {
          type: 'text',
          content: 'Some instructions'
        }
      ],
      data: [],
      output: []
    };

    const result = await driver.query(promptWithoutMessageElement);

    expect(mockCompletion).toHaveBeenCalled();
    expect(mockChat).not.toHaveBeenCalled();
    expect(result.content).toBe('completion response');
  });

  it('should detect MessageElement in data section', async () => {
    const driver = new MlxDriver({
      model: 'test-model'
    });

    const promptWithMessageInData: CompiledPrompt = {
      instructions: [],
      data: [
        {
          type: 'message',
          role: 'user',
          content: 'Hello'
        }
      ],
      output: []
    };

    await driver.query(promptWithMessageInData);

    expect(mockChat).toHaveBeenCalled();
    expect(mockCompletion).not.toHaveBeenCalled();
  });

  it('should detect MessageElement in output section', async () => {
    const driver = new MlxDriver({
      model: 'test-model'
    });

    const promptWithMessageInOutput: CompiledPrompt = {
      instructions: [],
      data: [],
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: 'Response template'
        }
      ]
    };

    await driver.query(promptWithMessageInOutput);

    expect(mockChat).toHaveBeenCalled();
    expect(mockCompletion).not.toHaveBeenCalled();
  });

  it('should use chat API when completion is not supported', async () => {
    mockGetSpecManager.mockReturnValue({
      preprocessMessages: (messages: unknown) => messages,
      determineApi: vi.fn().mockReturnValue('completion'),
      canUseChat: vi.fn().mockReturnValue(true),
      canUseCompletion: vi.fn().mockReturnValue(false), // Completion not supported
      generatePrompt: () => 'generated prompt'
    });

    const driver = new MlxDriver({
      model: 'test-model'
    });

    const prompt: CompiledPrompt = {
      instructions: [
        {
          type: 'text',
          content: 'Instructions'
        }
      ],
      data: [],
      output: []
    };

    await driver.query(prompt);

    expect(mockChat).toHaveBeenCalled();
    expect(mockCompletion).not.toHaveBeenCalled();
  });

  it('should use completion API when chat is not supported', async () => {
    mockGetSpecManager.mockReturnValue({
      preprocessMessages: (messages: unknown) => messages,
      determineApi: vi.fn().mockReturnValue('chat'),
      canUseChat: vi.fn().mockReturnValue(false), // Chat not supported
      canUseCompletion: vi.fn().mockReturnValue(true),
      generatePrompt: () => 'generated prompt'
    });

    const driver = new MlxDriver({
      model: 'test-model'
    });

    const prompt: CompiledPrompt = {
      instructions: [
        {
          type: 'text',
          content: 'Instructions'
        }
      ],
      data: [],
      output: []
    };

    await driver.query(prompt);

    expect(mockCompletion).toHaveBeenCalled();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('should apply same logic in streamQuery method', async () => {
    const driver = new MlxDriver({
      model: 'test-model'
    });

    const promptWithMessageElement: CompiledPrompt = {
      instructions: [
        {
          type: 'message',
          role: 'system',
          content: 'You are a helpful assistant'
        }
      ],
      data: [],
      output: []
    };

    const { stream, result } = await driver.streamQuery(promptWithMessageElement);

    // Collect chunks from stream
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Then get the result
    const queryResult = await result;

    expect(mockChat).toHaveBeenCalled();
    expect(mockCompletion).not.toHaveBeenCalled();
    expect(queryResult.content).toBe('chat response');
    expect(chunks.join('')).toBe('chat response');
  });
});