import { describe, it, expect } from 'vitest';
import { MessageValidator } from './validator.js';
import type { MlxMessage } from '../process/types.js';
import type { ChatRestrictions } from './types.js';

describe('MessageValidator', () => {
  describe('validateMessages', () => {
    it('should validate messages with no restrictions', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      const restrictions: ChatRestrictions = {};
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should detect multiple system messages when restricted', () => {
      const messages: MlxMessage[] = [
        { role: 'system', content: 'First system' },
        { role: 'system', content: 'Second system' },
        { role: 'user', content: 'Hello' }
      ];
      const restrictions: ChatRestrictions = {
        singleSystemAtStart: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('システムメッセージは1つまでです（2個検出）');
    });
    
    it('should detect non-alternating messages', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'user', content: 'Second' }
      ];
      const restrictions: ChatRestrictions = {
        alternatingTurns: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userが連続しています（位置: 1）');
    });
    
    it('should detect when last message is not user', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];
      const restrictions: ChatRestrictions = {
        requiresUserLast: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最後のメッセージはuserである必要があります（現在: assistant）');
    });
  });
  
  describe('generateSuggestedFixes', () => {
    it('should merge multiple system messages', () => {
      const messages: MlxMessage[] = [
        { role: 'system', content: 'First system' },
        { role: 'system', content: 'Second system' },
        { role: 'user', content: 'Hello' }
      ];
      const restrictions: ChatRestrictions = {
        singleSystemAtStart: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.suggestedFixes).toBeDefined();
      expect(result.suggestedFixes![0]).toEqual({
        role: 'system',
        content: 'First system\n\nSecond system'
      });
      expect(result.appliedFixes).toContain('複数のシステムメッセージ(2個)を1つに結合しました');
    });
    
    it('should move system message to start', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'System message' }
      ];
      const restrictions: ChatRestrictions = {
        singleSystemAtStart: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.suggestedFixes).toBeDefined();
      expect(result.suggestedFixes![0].role).toBe('system');
      expect(result.suggestedFixes![1].role).toBe('user');
      expect(result.appliedFixes).toContain('システムメッセージを先頭に移動しました');
    });
    
    it('should merge consecutive messages of same role', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'First question' },
        { role: 'user', content: 'Second question' },
        { role: 'assistant', content: 'Answer' },
        { role: 'assistant', content: 'Continued answer' }
      ];
      const restrictions: ChatRestrictions = {
        alternatingTurns: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.suggestedFixes).toBeDefined();
      expect(result.suggestedFixes!.length).toBe(2);
      expect(result.suggestedFixes![0]).toEqual({
        role: 'user',
        content: 'First question\n\nSecond question'
      });
      expect(result.suggestedFixes![1]).toEqual({
        role: 'assistant',
        content: 'Answer\n\nContinued answer'
      });
      expect(result.appliedFixes).toContain('連続する同じロールのメッセージを結合しました(2箇所)');
    });
    
    it('should add user message at end when required', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];
      const restrictions: ChatRestrictions = {
        requiresUserLast: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.suggestedFixes).toBeDefined();
      expect(result.suggestedFixes!.length).toBe(3);
      expect(result.suggestedFixes![2]).toEqual({
        role: 'user',
        content: 'Please proceed with the task.'
      });
      expect(result.appliedFixes).toContain('最後にユーザーメッセージを追加しました(元の最後: assistant)');
    });
    
    it('should handle complex case with multiple fixes', () => {
      const messages: MlxMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'system', content: 'System 1' },
        { role: 'system', content: 'System 2' },
        { role: 'user', content: 'Second' },
        { role: 'assistant', content: 'Response' }
      ];
      const restrictions: ChatRestrictions = {
        singleSystemAtStart: true,
        alternatingTurns: true,
        requiresUserLast: true
      };
      
      const result = MessageValidator.validateMessages(messages, restrictions);
      
      expect(result.suggestedFixes).toBeDefined();
      // システムメッセージが先頭に移動してマージされる
      expect(result.suggestedFixes![0].role).toBe('system');
      expect(result.suggestedFixes![0].content).toBe('System 1\n\nSystem 2');
      // ユーザーメッセージが結合される
      expect(result.suggestedFixes![1].role).toBe('user');
      expect(result.suggestedFixes![1].content).toBe('First\n\nSecond');
      // アシスタントメッセージ
      expect(result.suggestedFixes![2].role).toBe('assistant');
      // 最後にユーザーメッセージが追加される
      expect(result.suggestedFixes![3].role).toBe('user');
      expect(result.suggestedFixes![3].content).toBe('Please proceed with the task.');
      
      // 適用された修正の確認
      expect(result.appliedFixes).toContain('複数のシステムメッセージ(2個)を1つに結合しました');
      expect(result.appliedFixes).toContain('連続する同じロールのメッセージを結合しました(1箇所)');
      expect(result.appliedFixes).toContain('最後にユーザーメッセージを追加しました(元の最後: assistant)');
    });
  });
});