/**
 * MLX Driver Model Capability Detector
 * 
 * formatTest APIを使用してモデルの特性を動的に検出
 */

import type { MlxMessage } from '../process/types.js';
import type { MlxModelConfig, ChatRestrictions } from './types.js';
import { MessageValidator } from './validator.js';
import type { MlxProcess } from '../process/index.js';

/**
 * テストパターンの定義
 */
interface TestPattern {
  name: string;
  messages: MlxMessage[];
  primer?: string;
}

/**
 * モデル能力の検出器
 */
export class ModelCapabilityDetector {
  private process: MlxProcess;
  private modelName: string;
  
  constructor(process: MlxProcess, modelName: string) {
    this.process = process;
    this.modelName = modelName;
  }
  
  /**
   * モデルの特性を自動検出
   */
  async detectCapabilities(): Promise<Partial<MlxModelConfig>> {
    const config: Partial<MlxModelConfig> = {
      modelName: this.modelName
    };
    
    // 基本的な能力を取得
    try {
      const capabilities = await this.process.getCapabilities();
      
      config.capabilities = {
        hasApplyChatTemplate: capabilities.features.apply_chat_template,
        supportsCompletion: true, // デフォルトでtrueと仮定
        specialTokens: capabilities.special_tokens
      };

      // チャットテンプレートがある場合、制限を検出
      if (capabilities.features.apply_chat_template) {
        config.chatRestrictions = await this.detectChatRestrictions();
      }

      // completionが使えるかテスト
      config.capabilities.supportsCompletion = await this.testCompletionSupport();

      // API戦略の決定
      config.apiStrategy = this.determineApiStrategy(config);

    } catch (error) {
      console.error('Failed to detect capabilities:', error);
    }

    return config;
  }
  
  /**
   * チャットテンプレートの制限を検出
   */
  private async detectChatRestrictions(): Promise<ChatRestrictions> {
    const testPatterns = this.getTestPatterns();
    const testResults = new Map<string, any>();
    
    for (const pattern of testPatterns) {
      try {
        const result = await this.process.formatTest(pattern.messages, {
          primer: pattern.primer
        });
        testResults.set(pattern.name, result);
      } catch (error) {
        testResults.set(pattern.name, { error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return MessageValidator.inferRestrictionsFromTestResults(testResults);
  }
  
  /**
   * completion APIのサポートをテスト
   */
  private async testCompletionSupport(): Promise<boolean> {
    try {
      // シンプルなcompletionテスト
      const testPrompt = 'Test prompt for completion API.';
      const result = await this.process.formatTest([
        { role: 'user', content: testPrompt }
      ]);
      
      // formatTestが成功し、template_appliedがfalseならcompletionが使える可能性が高い
      return !result.template_applied || !result.error;
    } catch {
      return false;
    }
  }
  
  /**
   * API戦略を決定
   */
  private determineApiStrategy(config: Partial<MlxModelConfig>): MlxModelConfig['apiStrategy'] {
    const hasChat = config.capabilities?.hasApplyChatTemplate;
    const hasCompletion = config.capabilities?.supportsCompletion;
    const restrictions = config.chatRestrictions;
    
    // 両方使える場合
    if (hasChat && hasCompletion) {
      // 制限が多い場合はcompletionを優先
      const restrictionCount = Object.keys(restrictions || {}).length;
      if (restrictionCount >= 3) {
        return 'prefer-completion';
      }
      return 'auto';
    }
    
    // chatのみ
    if (hasChat && !hasCompletion) {
      return 'force-chat';
    }
    
    // completionのみ
    if (!hasChat && hasCompletion) {
      return 'force-completion';
    }
    
    // どちらも使えない（通常はありえない）
    return 'auto';
  }
  
  /**
   * テストパターンの生成
   */
  private getTestPatterns(): TestPattern[] {
    return [
      // 基本パターン
      {
        name: 'basic',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      },
      
      // システムメッセージ付き
      {
        name: 'with-system',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' }
        ]
      },
      
      // 複数システムメッセージ
      {
        name: 'multi-system',
        messages: [
          { role: 'system', content: 'First system message.' },
          { role: 'system', content: 'Second system message.' },
          { role: 'user', content: 'Hello' }
        ]
      },
      
      // 連続ユーザーメッセージ
      {
        name: 'consecutive-user',
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'user', content: 'Second question' }
        ]
      },
      
      // アシスタントで終わる
      {
        name: 'assistant-last',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      },
      
      // 交互の会話
      {
        name: 'alternating',
        messages: [
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
          { role: 'user', content: 'Question 2' }
        ]
      },
      
      // primerテスト
      {
        name: 'with-primer',
        messages: [
          { role: 'user', content: 'Generate a list' }
        ],
        primer: '1. '
      },
      
      // 空メッセージ
      {
        name: 'empty-message',
        messages: [
          { role: 'user', content: '' }
        ]
      },
      
      // システムメッセージが途中にある
      {
        name: 'system-middle',
        messages: [
          { role: 'user', content: 'First' },
          { role: 'system', content: 'System in middle' },
          { role: 'user', content: 'Second' }
        ]
      }
    ];
  }
}