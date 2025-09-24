/**
 * モデル固有処理のユニットテスト
 */
import { describe, it, expect } from 'vitest';
import { createModelSpecificProcessor } from './model-specific.js';
import type { MlxMessage } from './types.js';

describe('ModelSpecificProcessor', () => {
  describe('Tanuki-8B-dpo-v1 processing', () => {
    const processor = createModelSpecificProcessor('Tanuki-8B-dpo-v1');
    
    it('should add system and user messages', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      
      const result = processor.applyChatSpecificProcessing(messages);
      
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('以下は、タスクを説明する指示です');
      expect(result[1].role).toBe('user');
      expect(result[1].content).toBe('Hello');
      expect(result[2].role).toBe('user');
      expect(result[2].content).toContain('systemプロンプトで説明されたタスクを正確に実行し');
    });
  });

  describe('CodeLlama processing', () => {
    const processor = createModelSpecificProcessor('mlx-community/CodeLlama-7b');
    
    it('should merge system messages and add user message if needed', () => {
      const messages: MlxMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'assistant', content: 'How can I help?' }
      ];
      
      const result = processor.applyChatSpecificProcessing(messages);
      
      expect(result[result.length - 1].role).toBe('user');
      expect(result[result.length - 1].content).toBe('Read the system prompt and output the appropriate content.');
    });
  });

  describe('Gemma-3 processing', () => {
    const processor = createModelSpecificProcessor('mlx-community/gemma-3-2b');
    
    it('should ensure alternating pattern ends with user', () => {
      const messages: MlxMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'assistant', content: 'Assistant response' }
      ];
      
      const result = processor.applyChatSpecificProcessing(messages);
      
      expect(result[result.length - 1].role).toBe('user');
    });
  });

  describe('Unknown model processing', () => {
    const processor = createModelSpecificProcessor('unknown-model');
    
    it('should return messages unchanged', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const result = processor.applyChatSpecificProcessing(messages);
      
      expect(result).toEqual(messages);
    });
  });

  describe('Completion specific processing', () => {
    it('should format llm-jp-3.1 prompt correctly', () => {
      const processor = createModelSpecificProcessor('llm-jp-3.1');
      const prompt = 'Generate a summary';

      const result = processor.applyCompletionSpecificProcessing(prompt);

      expect(result).toContain('<s>');
      expect(result).toContain('### 指示:');
      expect(result).toContain('Generate a summary');
      expect(result).toContain('### 応答:');
    });

    it('should format Tanuki-8B prompt with block tokens', () => {
      const processor = createModelSpecificProcessor('Tanuki-8B-dpo-v1');
      const prompt = 'Generate a story';

      const result = processor.applyCompletionSpecificProcessing(prompt);

      expect(result).toContain('### システム:');
      expect(result).toContain('Generate a story');
      expect(result).toContain('### 応答:');
    });

    it('should format Gemma-3 prompt with turn markers', () => {
      const processor = createModelSpecificProcessor('mlx-community/gemma-3-2b');
      const prompt = 'Answer this question';

      const result = processor.applyCompletionSpecificProcessing(prompt);

      expect(result).toContain('<start_of_turn>user');
      expect(result).toContain('Answer this question');
      expect(result).toContain('<start_of_turn>model');
    });

    it('should pass through CodeLlama prompt unchanged', () => {
      const processor = createModelSpecificProcessor('mlx-community/CodeLlama-7b');
      const prompt = 'Complete this code';

      const result = processor.applyCompletionSpecificProcessing(prompt);

      expect(result).toBe(prompt);
    });

    it('should return prompt unchanged for other models', () => {
      const processor = createModelSpecificProcessor('other-model');
      const prompt = 'Test prompt';

      const result = processor.applyCompletionSpecificProcessing(prompt);

      expect(result).toBe(prompt);
    });
  });

  describe('Generate merged prompt', () => {
    const processor = createModelSpecificProcessor('test-model');
    
    it('should format messages with default markers', () => {
      const messages: MlxMessage[] = [
        { role: 'system', content: 'System instruction' },
        { role: 'user', content: 'User question' },
        { role: 'assistant', content: 'Assistant response' }
      ];
      
      const result = processor.generateMergedPrompt(messages);
      
      // デフォルトフォーマッターはHTMLスタイルのコメントを使用
      expect(result).toContain('System instruction');
      expect(result).toContain('User question');
      expect(result).toContain('Assistant response');
      // 各メッセージがロールマーカーで囲まれていることを確認
      expect(result).toMatch(/SYSTEM[\s\S]*System instruction[\s\S]*SYSTEM/);
      expect(result).toMatch(/USER[\s\S]*User question[\s\S]*USER/);
      expect(result).toMatch(/ASSISTANT[\s\S]*Assistant response[\s\S]*ASSISTANT/);
    });
  });
});