/**
 * MLX Driver Model Spec Manager
 * 
 * モデル仕様の管理と適用
 */

import type { MlxMessage } from '../process/types.js';
import type { ModelSpec, ApiStrategy, ModelCustomProcessor } from './types.js';
import { mergeWithPreset } from './presets.js';
import { ModelCapabilityDetector } from './detector.js';
import { MessageValidator } from './validator.js';
import type { MlxProcess } from '../process/index.js';

/**
 * ModelSpec管理クラス
 */
export class ModelSpecManager {
  private spec: ModelSpec;
  private detector: ModelCapabilityDetector;
  private process: MlxProcess;
  private initialized = false;
  
  constructor(
    modelName: string,
    process: MlxProcess,
    customSpec?: Partial<ModelSpec>,
    customProcessor?: ModelCustomProcessor
  ) {
    this.process = process;
    this.detector = new ModelCapabilityDetector(process, modelName);

    // プリセット設定を取得（customSpecは渡さない - 優先度を明示的に制御）
    const presetSpec = mergeWithPreset(modelName);

    // マージ戦略（パラメータごとに異なるマージ深さを使用）:
    //
    // 1. apiStrategy: SHALLOW MERGE（値の完全置換）
    //    - カスタム指定があればそれを使用、なければプリセット、なければ'auto'
    const apiStrategy = customSpec?.apiStrategy ?? presetSpec.apiStrategy ?? 'auto';

    // 2. capabilities: DEEP MERGE（プロパティごとにマージ）
    //    - プリセットの全プロパティを保持しつつ、カスタムで上書き
    //    - 例: プリセット{a:1, b:2} + カスタム{b:3, c:4} = {a:1, b:3, c:4}
    const capabilities = {
      ...presetSpec.capabilities,
      ...customSpec?.capabilities
    };

    // 3. chatRestrictions: SHALLOW MERGE with undefined support（完全置換 or クリア）
    //    - customSpecでundefined指定: プリセット制限をクリア
    //    - customSpecで値指定: その値で完全置換（プリセット無視）
    //    - customSpec未指定: プリセットを使用
    const chatRestrictions = customSpec?.chatRestrictions !== undefined
      ? customSpec.chatRestrictions
      : presetSpec.chatRestrictions;

    // 4. customProcessor: SHALLOW MERGE（優先度チェーン）
    //    - 引数 > カスタムSpec > プリセット
    const processor = customProcessor ?? customSpec?.customProcessor ?? presetSpec.customProcessor;

    this.spec = {
      modelName,
      apiStrategy,
      capabilities,
      chatRestrictions,
      customProcessor: processor,
      validatedPatterns: new Map()
    };
  }
  
  /**
   * 初期化（動的検出）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 動的に能力を検出
    const detectedSpec = await this.detector.detectCapabilities();

    // capabilitiesのみ検出結果とマージ
    // apiStrategyとchatRestrictionsはconstructorで設定済みの値を保持
    this.spec = {
      ...this.spec,
      capabilities: {
        ...this.spec.capabilities,
        ...detectedSpec.capabilities
      }
    };

    this.initialized = true;
  }
  
  /**
   * 使用するAPIを決定
   */
  determineApi(messages: MlxMessage[]): 'chat' | 'completion' {
    const strategy = this.spec.apiStrategy || 'auto';
    
    // 強制モード
    if (strategy === 'force-chat') return 'chat';
    if (strategy === 'force-completion') return 'completion';
    
    // チャットテンプレートがない場合
    if (!this.spec.capabilities?.hasApplyChatTemplate) {
      return 'completion';
    }
    
    // completionが使えない場合
    if (!this.spec.capabilities?.supportsCompletion) {
      return 'chat';
    }
    
    // 優先モード
    if (strategy === 'prefer-chat') {
      // メッセージが有効かチェック
      const validation = this.validateMessages(messages);
      if (validation.valid) {
        return 'chat';
      }
      // 無効な場合はcompletionにフォールバック
      return 'completion';
    }
    
    if (strategy === 'prefer-completion') {
      return 'completion';
    }
    
    // auto: メッセージパターンと制限から判断
    const validation = this.validateMessages(messages);
    
    // チャット制限に違反している場合はcompletion
    if (!validation.valid && this.spec.capabilities.supportsCompletion) {
      return 'completion';
    }
    
    // 制限が多い場合はcompletion優先
    const restrictionCount = Object.keys(this.spec.chatRestrictions || {}).length;
    if (restrictionCount >= 3 && this.spec.capabilities.supportsCompletion) {
      return 'completion';
    }
    
    return 'chat';
  }
  
  /**
   * メッセージの検証
   */
  validateMessages(messages: MlxMessage[]) {
    // カスタムバリデーターがあれば使用
    if (this.spec.customProcessor?.validateMessages) {
      return this.spec.customProcessor.validateMessages(messages);
    }
    
    // キャッシュチェック
    const key = JSON.stringify(messages);
    const cached = this.spec.validatedPatterns?.get(key);
    if (cached) return cached;
    
    // 標準バリデーション
    const result = MessageValidator.validateMessages(
      messages,
      this.spec.chatRestrictions || {}
    );
    
    // キャッシュに保存
    this.spec.validatedPatterns?.set(key, result);
    
    return result;
  }
  
  /**
   * メッセージの前処理
   */
  preprocessMessages(messages: MlxMessage[]): MlxMessage[] {
    // カスタムプロセッサーがあれば使用
    if (this.spec.customProcessor?.preprocessMessages) {
      return this.spec.customProcessor.preprocessMessages(messages);
    }
    
    // バリデーション結果に基づいて修正
    const validation = this.validateMessages(messages);
    if (!validation.valid && validation.suggestedFixes) {
      // 自動修正を適用したことを警告
      console.warn('[MLX Driver] メッセージを自動修正しました:');
      
      // エラーを表示
      if (validation.errors) {
        validation.errors.forEach(error => {
          console.warn(`  エラー: ${error}`);
        });
      }
      
      // 適用された修正を表示
      if (validation.appliedFixes) {
        validation.appliedFixes.forEach(fix => {
          console.warn(`  修正: ${fix}`);
        });
      }
      
      return validation.suggestedFixes;
    }
    
    // 警告のみの場合も表示
    if (validation.warnings) {
      validation.warnings.forEach(warning => {
        console.warn(`[MLX Driver] 警告: ${warning}`);
      });
    }
    
    return messages;
  }
  
  /**
   * completionプロンプトの前処理
   */
  preprocessCompletion(prompt: string): string {
    if (this.spec.customProcessor?.preprocessCompletion) {
      return this.spec.customProcessor.preprocessCompletion(prompt);
    }
    return prompt;
  }

  /**
   * スペック情報の取得
   */
  getSpec(): Readonly<ModelSpec> {
    return this.spec;
  }
  
  /**
   * chat APIが使用可能か
   */
  canUseChat(): boolean {
    return this.spec.capabilities?.hasApplyChatTemplate || false;
  }
  
  /**
   * completion APIが使用可能か  
   */
  canUseCompletion(): boolean {
    return this.spec.capabilities?.supportsCompletion !== false;
  }
}