/**
 * MLX Driver Message Validator
 * 
 * formatTest APIを使用してメッセージの検証とモデル特性の判定
 */

import type { MlxMessage, MlxFormatTestResult } from '../process/types.js';
import type { ChatRestrictions, ValidationResult } from './types.js';

/**
 * メッセージパターンの検証
 */
export class MessageValidator {
  
  /**
   * メッセージ配列がチャット制限に適合するか検証
   */
  static validateMessages(
    messages: MlxMessage[], 
    restrictions: ChatRestrictions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // システムメッセージのチェック
    const systemMessages = messages.filter(m => m.role === 'system');
    
    if (restrictions.singleSystemAtStart) {
      if (systemMessages.length > 1) {
        errors.push(`システムメッセージは1つまでです（${systemMessages.length}個検出）`);
      }
      if (systemMessages.length === 1 && messages[0].role !== 'system') {
        errors.push('システムメッセージは最初に配置する必要があります');
      }
    }
    
    if (restrictions.maxSystemMessages !== undefined) {
      if (systemMessages.length > restrictions.maxSystemMessages) {
        errors.push(`システムメッセージは最大${restrictions.maxSystemMessages}個までです`);
      }
    }
    
    // 交互発言のチェック
    if (restrictions.alternatingTurns) {
      const conversationStart = restrictions.singleSystemAtStart && messages[0].role === 'system' ? 1 : 0;
      let lastRole: string | null = null;
      
      for (let i = conversationStart; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'system') continue; // システムメッセージはスキップ
        
        if (lastRole === msg.role) {
          errors.push(`${msg.role}が連続しています（位置: ${i}）`);
        }
        lastRole = msg.role;
      }
    }
    
    // 最後がuserかチェック
    if (restrictions.requiresUserLast && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') {
        errors.push(`最後のメッセージはuserである必要があります（現在: ${lastMessage.role}）`);
      }
    }
    
    // 空メッセージのチェック
    if (!restrictions.allowEmptyMessages) {
      messages.forEach((msg, i) => {
        if (!msg.content || msg.content.trim() === '') {
          warnings.push(`空のメッセージが検出されました（位置: ${i}, role: ${msg.role}）`);
        }
      });
    }
    
    // 修正案の生成
    let suggestedFixes: MlxMessage[] | undefined;
    if (errors.length > 0) {
      suggestedFixes = this.generateSuggestedFixes(messages, restrictions);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedFixes
    };
  }
  
  /**
   * 修正案の生成
   */
  private static generateSuggestedFixes(
    messages: MlxMessage[], 
    restrictions: ChatRestrictions
  ): MlxMessage[] {
    let fixed = [...messages];
    
    // システムメッセージの修正
    if (restrictions.singleSystemAtStart) {
      const systemMessages = fixed.filter(m => m.role === 'system');
      const nonSystemMessages = fixed.filter(m => m.role !== 'system');
      
      if (systemMessages.length > 1) {
        // 複数のシステムメッセージを1つにマージ
        const mergedSystem: MlxMessage = {
          role: 'system',
          content: systemMessages.map(m => m.content).join('\n\n')
        };
        fixed = [mergedSystem, ...nonSystemMessages];
      } else if (systemMessages.length === 1 && fixed[0].role !== 'system') {
        // システムメッセージを先頭に移動
        fixed = [...systemMessages, ...nonSystemMessages];
      }
    }
    
    // 最後をuserにする修正
    if (restrictions.requiresUserLast && fixed.length > 0) {
      const lastMessage = fixed[fixed.length - 1];
      if (lastMessage.role !== 'user') {
        // デフォルトのユーザーメッセージを追加
        fixed.push({
          role: 'user',
          content: 'Please proceed with the task.'
        });
      }
    }
    
    // 交互発言の修正（簡易版）
    if (restrictions.alternatingTurns) {
      const conversationStart = restrictions.singleSystemAtStart && fixed[0].role === 'system' ? 1 : 0;
      const result: MlxMessage[] = conversationStart > 0 ? [fixed[0]] : [];
      let lastRole: string | null = null;
      
      for (let i = conversationStart; i < fixed.length; i++) {
        const msg = fixed[i];
        if (msg.role === 'system') continue;
        
        if (lastRole !== msg.role) {
          result.push(msg);
          lastRole = msg.role;
        }
        // 同じロールが連続する場合はスキップ（内容をマージする選択肢もある）
      }
      
      fixed = result;
    }
    
    return fixed;
  }
  
  /**
   * formatTest APIの結果から制限を推測
   */
  static inferRestrictionsFromTestResults(
    testResults: Map<string, MlxFormatTestResult>
  ): ChatRestrictions {
    const restrictions: ChatRestrictions = {};
    
    // パターンごとのテスト結果を分析
    // 例: システムメッセージが複数ある場合のエラー
    const multiSystemTest = testResults.get('multi-system');
    if (multiSystemTest?.error) {
      restrictions.singleSystemAtStart = true;
      restrictions.maxSystemMessages = 1;
    }
    
    // 例: 交互発言でないとエラーになるか
    const consecutiveUserTest = testResults.get('consecutive-user');
    if (consecutiveUserTest?.error) {
      restrictions.alternatingTurns = true;
    }
    
    // 例: 最後がassistantでエラーになるか
    const assistantLastTest = testResults.get('assistant-last');
    if (assistantLastTest?.error) {
      restrictions.requiresUserLast = true;
    }
    
    return restrictions;
  }
}