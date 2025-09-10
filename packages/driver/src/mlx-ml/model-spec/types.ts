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
 * モデル固有の処理カスタマイザー
 */
export interface ModelCustomProcessor {
  /** メッセージの前処理 */
  preprocessMessages?: (messages: MlxMessage[]) => MlxMessage[];
  
  /** completionプロンプトの前処理 */
  preprocessCompletion?: (prompt: string) => string;
  
  /** メッセージの検証 */
  validateMessages?: (messages: MlxMessage[]) => ValidationResult;
  
  /** プロンプト生成のカスタマイズ */
  generatePrompt?: (messages: MlxMessage[]) => string;
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
 * モデル仕様
 */
export interface ModelSpec {
  /** モデル名/ID */
  modelName: string;
  
  /** 動的に取得される機能情報 */
  capabilities?: {
    hasApplyChatTemplate?: boolean;
    supportsCompletion?: boolean;
    specialTokens?: Record<string, any>;
  };
  
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
 * モデル仕様のプリセット（よく知られたモデル用）
 */
export interface ModelSpecPreset {
  pattern: RegExp;  // モデル名にマッチするパターン
  spec: Partial<ModelSpec>;
}