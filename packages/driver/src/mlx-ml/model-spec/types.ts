/**
 * MLX Driver Model Specification Types
 * 
 * モデルの特性・制限・振る舞いを定義
 */

import type { MlxMessage } from '../process/types.js';

/**
 * チャットテンプレートの制限事項
 */
export interface ChatRestrictions {
  /** systemメッセージは先頭に1つだけ */
  singleSystemAtStart?: boolean;
  
  /** user/assistantメッセージが交互に出現する必要がある */
  alternatingTurns?: boolean;
  
  /** 最後のメッセージはuserでなければならない */
  requiresUserLast?: boolean;
  
  /** システムメッセージの最大数 */
  maxSystemMessages?: number;
  
  /** 空のメッセージを許可するか */
  allowEmptyMessages?: boolean;
}

/**
 * メッセージ検証結果
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestedFixes?: MlxMessage[];
  appliedFixes?: string[];  // 適用された修正の説明
}

/**
 * MLXモデルの機能情報
 */
export interface MlxCapabilities {
  /** chat template機能が利用可能か */
  hasApplyChatTemplate?: boolean;

  /** completion API対応か */
  supportsCompletion?: boolean;

  /** 特殊トークン情報 */
  specialTokens?: Record<string, any>;
}

/**
 * API選択のコンテキスト情報
 *
 * customProcessor.determineApi()に渡されるコンテキスト
 */
export interface ApiSelectionContext {
  /** 処理対象のメッセージ */
  messages: MlxMessage[];

  /** メッセージの検証結果 */
  validation: ValidationResult;

  /** モデルの機能情報 */
  capabilities: MlxCapabilities;

  /** チャット制限 */
  chatRestrictions?: ChatRestrictions;

  /** 設定されたapiStrategy */
  apiStrategy: ApiStrategy;
}

/**
 * モデル固有の処理カスタマイザー
 */
export interface ModelCustomProcessor {
  /** メッセージの前処理 */
  preprocessMessages?: (messages: MlxMessage[]) => MlxMessage[];

  /** completionプロンプトの前処理 */
  preprocessCompletion?: (prompt: string) => string;

  /** メッセージの検証 */
  validateMessages?: (messages: MlxMessage[]) => ValidationResult;

  /**
   * カスタムAPI選択ロジック
   *
   * @param context - API選択に必要なコンテキスト情報
   * @returns 'chat' | 'completion' | undefined
   *          - 'chat' または 'completion' を返すと、その値が優先される
   *          - undefined を返すと、デフォルトのAPI選択ロジックが実行される
   *
   * @example
   * ```typescript
   * determineApi: (context) => {
   *   // system → user → system(cue) パターンを検出
   *   const hasCuePattern =
   *     context.messages.length >= 3 &&
   *     context.messages[0].role === 'system' &&
   *     context.messages[context.messages.length - 1].role === 'system';
   *
   *   // このパターンがあり、singleSystemAtStart制限がある場合
   *   if (hasCuePattern && context.chatRestrictions?.singleSystemAtStart) {
   *     return 'completion';  // completionを強制
   *   }
   *
   *   // それ以外はデフォルトロジックに委譲
   *   return undefined;
   * }
   * ```
   */
  determineApi?: (context: ApiSelectionContext) => 'chat' | 'completion' | undefined;
}

/**
 * APIの選択戦略
 */
export type ApiStrategy = 
  | 'auto'           // 自動判定（デフォルト）
  | 'prefer-chat'    // chatを優先
  | 'prefer-completion' // completionを優先
  | 'force-chat'     // 常にchat
  | 'force-completion'; // 常にcompletion

/**
 * MLXモデルの設定と動作仕様
 */
export interface MlxModelConfig {
  /** モデル名/ID */
  modelName: string;

  /** 動的に取得される機能情報 */
  capabilities?: MlxCapabilities;

  /** API選択戦略 */
  apiStrategy?: ApiStrategy;

  /** チャットテンプレートの制限 */
  chatRestrictions?: ChatRestrictions;

  /** カスタム処理（外部から注入可能） */
  customProcessor?: ModelCustomProcessor;

  /** 検証済みパターンのキャッシュ */
  validatedPatterns?: Map<string, ValidationResult>;
}

/**
 * MLXモデル設定のプリセット（よく知られたモデル用）
 */
export interface MlxModelConfigPreset {
  /** モデル名にマッチするパターン */
  pattern: RegExp;

  /** プリセット設定 */
  config: Partial<MlxModelConfig>;
}