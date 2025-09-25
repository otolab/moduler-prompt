import { describe, it, expect } from 'vitest';
import { hasMessageElement, convertMessages, determineApiSelection } from './mlx-driver.js';
import type { CompiledPrompt } from '@moduler-prompt/core';
import type { ChatMessage } from '../formatter/types.js';

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
    const createMockSpecManager = (canChat: boolean, canCompletion: boolean) => ({
      canUseChat: () => canChat,
      canUseCompletion: () => canCompletion,
      preprocessMessages: (msgs: any) => msgs,
      determineApi: () => 'chat' as const
    });

    it('should prefer chat when MessageElement is present and chat is available', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(true, true),
        {}
      );

      expect(result).toBe('chat');
    });

    it('should fallback to completion when MessageElement is present but chat unavailable', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'message', role: 'system', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(false, true),
        {}
      );

      expect(result).toBe('completion');
    });

    it('should use completion when no MessageElement and chat unavailable', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(false, true),
        {}
      );

      expect(result).toBe('completion');
    });

    it('should use chat when no MessageElement and completion unavailable', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };

      const result = determineApiSelection(
        prompt,
        createMockSpecManager(true, false),
        {}
      );

      expect(result).toBe('chat');
    });

    it('should use model determination when both APIs available and no MessageElement', () => {
      const prompt: CompiledPrompt = {
        instructions: [{ type: 'text', content: 'test' }],
        data: [],
        output: []
      };

      const mockSpecManager = {
        canUseChat: () => true,
        canUseCompletion: () => true,
        preprocessMessages: (msgs: any) => msgs,
        determineApi: () => 'completion' as const
      };

      const result = determineApiSelection(prompt, mockSpecManager, {});

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
  });
});