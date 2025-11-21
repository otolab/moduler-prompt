import { describe, it, expect } from 'vitest';
import { hasMessageElement, convertMessages, determineApiSelection } from './mlx-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { ChatMessage } from '../formatter/types.js';
import type { MlxMessage } from './process/types.js';

describe('MLXDriver Utility Functions', () => {
  describe('hasMessageElement', () => {
    it('should detect message element in instructions', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };
      expect(hasMessageElement(prompt)).toBe(true);
    });

    it('should detect message element in data', () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [{ type: 'message', role: 'user', content: 'test' }],
        output: []
      };
      expect(hasMessageElement(prompt)).toBe(true);
    });

    it('should detect message element in output', () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [],
        output: [{ type: 'message', role: 'assistant', content: 'test' }]
      };
      expect(hasMessageElement(prompt)).toBe(true);
    });

    it('should return false when no message elements', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'text' }],
        data: [{ type: 'section', title: 'Data', items: [] }],
        output: []
      };
      expect(hasMessageElement(prompt)).toBe(false);
    });

    it('should handle empty prompt', () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [],
        output: []
      };
      expect(hasMessageElement(prompt)).toBe(false);
    });
  });

  describe('convertMessages', () => {
    it('should convert ChatMessage to MlxMessage format', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ];

      const result = convertMessages(messages);

      expect(result).toEqual([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ]);
    });

    it('should handle empty messages array', () => {
      const messages: ChatMessage[] = [];
      const result = convertMessages(messages);
      expect(result).toEqual([]);
    });
  });

  describe('determineApiSelection', () => {
    const createMockSpecManager = (
      canChat: boolean,
      canCompletion: boolean,
      apiResult: 'chat' | 'completion' = 'chat'
    ) => ({
      canUseChat: () => canChat,
      canUseCompletion: () => canCompletion,
      preprocessMessages: (msgs: MlxMessage[]) => msgs,
      determineApi: () => apiResult
    });

    it('should delegate to specManager.determineApi() for all prompts', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(true, true, 'chat'),
        {}
      );

      expect(result).toBe('chat');
    });

    it('should respect determineApi() result even with MessageElement', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };

      // specManager.determineApi()が'completion'を返す場合（force-completionなど）
      const result = determineApiSelection(
        prompt,
        createMockSpecManager(true, true, 'completion'),
        {}
      );

      expect(result).toBe('completion');
    });

    it('should use determineApi() result for text-only prompts', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(true, true, 'completion'),
        {}
      );

      expect(result).toBe('completion');
    });

    it('should throw error when neither API is available', () => {
      const prompt: CompiledPrompt = {
        instructions: [],
        data: [],
        output: []
      };

      expect(() => {
        determineApiSelection(
          prompt,
          createMockSpecManager(false, false),
          {}
        );
      }).toThrow('Model supports neither chat nor completion API');
    });

    it('should call preprocessMessages before determineApi', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };

      let preprocessCalled = false;
      const mockSpecManager = {
        canUseChat: () => true,
        canUseCompletion: () => true,
        preprocessMessages: (msgs: MlxMessage[]) => {
          preprocessCalled = true;
          return msgs;
        },
        determineApi: () => 'chat' as const
      };

      determineApiSelection(prompt, mockSpecManager, {});
      expect(preprocessCalled).toBe(true);
    });
  });
});