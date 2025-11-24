/**
 * MLX Driver Model Config Manager
 *
 * MLXモデル設定の管理と適用
 */

import type { MlxMessage } from '../process/types.js';
import type { MlxModelConfig, ApiStrategy, ModelCustomProcessor, ApiSelectionContext } from './types.js';
import { getPresetConfig } from './presets.js';
import { ModelCapabilityDetector } from './detector.js';
import { MessageValidator } from './validator.js';
import type { MlxProcess } from '../process/index.js';

/**
 * MLXモデル設定管理クラス
 */
export class MlxModelConfigManager {
  private config: MlxModelConfig;
  private detector: ModelCapabilityDetector;
  private process: MlxProcess;
  private initialized = false;
  
  constructor(
    modelName: string,
    process: MlxProcess,
    customConfig?: Partial<MlxModelConfig>,
    customProcessor?: ModelCustomProcessor
  ) {
    this.process = process;
    this.detector = new ModelCapabilityDetector(process, modelName);

    // プリセット設定を取得（優先度を明示的に制御）
    const presetConfig = getPresetConfig(modelName);

    // マージ戦略（パラメータごとに異なるマージ深さを使用）:
    //
    // 1. apiStrategy: SHALLOW MERGE（値の完全置換）
    //    - カスタム指定があればそれを使用、なければプリセット、なければ'auto'
    const apiStrategy = customConfig?.apiStrategy ?? presetConfig.apiStrategy ?? 'auto';

    // 2. capabilities: DEEP MERGE（プロパティごとにマージ）
    //    - プリセットの全プロパティを保持しつつ、カスタムで上書き
    //    - 例: プリセット{a:1, b:2} + カスタム{b:3, c:4} = {a:1, b:3, c:4}
    const capabilities = {
      ...presetConfig.capabilities,
      ...customConfig?.capabilities
    };

    // 3. chatRestrictions: SHALLOW MERGE with undefined support（完全置換 or クリア）
    //    - customConfigでundefined指定: プリセット制限をクリア
    //    - customConfigで値指定: その値で完全置換（プリセット無視）
    //    - customConfig未指定: プリセットを使用
    const chatRestrictions = customConfig?.chatRestrictions !== undefined
      ? customConfig.chatRestrictions
      : presetConfig.chatRestrictions;

    // 4. customProcessor: SHALLOW MERGE（優先度チェーン）
    //    - 引数 > カスタムConfig > プリセット
    const processor = customProcessor ?? customConfig?.customProcessor ?? presetConfig.customProcessor;

    this.config = {
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
    const detected = await this.detector.detectCapabilities();

    // 検出結果とマージ（カスタム設定を優先）
    this.config = this.mergeConfigs(detected, this.config);

    this.initialized = true;
  }

  /**
   * 設定のマージ（baseに対してoverrideを優先的にマージ）
   */
  private mergeConfigs(
    base: Partial<MlxModelConfig>,
    override: MlxModelConfig
  ): MlxModelConfig {
    // chatRestrictions: undefinedの場合は保持、それ以外はDEEP MERGE
    const chatRestrictions = override.chatRestrictions === undefined
      ? undefined
      : {
          ...base.chatRestrictions,
          ...override.chatRestrictions
        };

    return {
      ...override,
      // capabilities: DEEP MERGE（プロパティごとにマージ）
      capabilities: {
        ...base.capabilities,
        ...override.capabilities
      },
      chatRestrictions,
      // apiStrategy: カスタム設定があればそれを優先、なければ検出結果
      apiStrategy: override.apiStrategy ?? base.apiStrategy ?? 'auto'
    };
  }
  
  /**
   * 使用するAPIを決定
   *
   * デフォルトのAPI選択ロジック:
   * 1. カスタムロジック (customProcessor.determineApi) が優先
   * 2. 強制モード (force-chat/force-completion)
   * 3. 機能チェック (hasApplyChatTemplate, supportsCompletion)
   * 4. 優先モード (prefer-chat/prefer-completion)
   * 5. auto: メッセージ検証と制限から判断
   */
  determineApi(messages: MlxMessage[]): 'chat' | 'completion' {
    const strategy = this.config.apiStrategy || 'auto';

    // カスタムAPI選択ロジックが提供されている場合は優先
    if (this.config.customProcessor?.determineApi) {
      const validation = this.validateMessages(messages);
      const context: ApiSelectionContext = {
        messages,
        validation,
        capabilities: this.config.capabilities || {},
        chatRestrictions: this.config.chatRestrictions,
        apiStrategy: strategy
      };

      const customResult = this.config.customProcessor.determineApi(context);
      if (customResult !== undefined) {
        return customResult;
      }
      // undefined の場合はデフォルトロジックに続行
    }

    // 強制モード
    if (strategy === 'force-chat') return 'chat';
    if (strategy === 'force-completion') return 'completion';

    // チャットテンプレートがない場合
    if (!this.config.capabilities?.hasApplyChatTemplate) {
      return 'completion';
    }

    // completionが使えない場合
    if (!this.config.capabilities?.supportsCompletion) {
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
    if (!validation.valid && this.config.capabilities.supportsCompletion) {
      return 'completion';
    }

    // 制限が多い場合はcompletion優先
    const restrictionCount = Object.keys(this.config.chatRestrictions || {}).length;
    if (restrictionCount >= 3 && this.config.capabilities.supportsCompletion) {
      return 'completion';
    }

    return 'chat';
  }
  
  /**
   * メッセージの検証
   */
  validateMessages(messages: MlxMessage[]) {
    // カスタムバリデーターがあれば使用
    if (this.config.customProcessor?.validateMessages) {
      return this.config.customProcessor.validateMessages(messages);
    }

    // キャッシュチェック
    const key = JSON.stringify(messages);
    const cached = this.config.validatedPatterns?.get(key);
    if (cached) return cached;

    // 標準バリデーション
    const result = MessageValidator.validateMessages(
      messages,
      this.config.chatRestrictions || {}
    );

    // キャッシュに保存
    this.config.validatedPatterns?.set(key, result);

    return result;
  }

  /**
   * メッセージの前処理
   */
  preprocessMessages(messages: MlxMessage[]): MlxMessage[] {
    // カスタムプロセッサーがあれば使用
    if (this.config.customProcessor?.preprocessMessages) {
      return this.config.customProcessor.preprocessMessages(messages);
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
    if (this.config.customProcessor?.preprocessCompletion) {
      return this.config.customProcessor.preprocessCompletion(prompt);
    }
    return prompt;
  }

  /**
   * 設定情報の取得
   */
  getConfig(): Readonly<MlxModelConfig> {
    return this.config;
  }

  /**
   * chat APIが使用可能か
   */
  canUseChat(): boolean {
    return this.config.capabilities?.hasApplyChatTemplate || false;
  }

  /**
   * completion APIが使用可能か
   */
  canUseCompletion(): boolean {
    return this.config.capabilities?.supportsCompletion !== false;
  }
}