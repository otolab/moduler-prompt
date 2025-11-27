/**
 * MLX Driver Model Specification Types
 *
 * モデルの特性・制限・振る舞いを定義（簡素化版）
 */

/**
 * チャットテンプレートの制限事項
 *
 * Note: 現在は未使用だが、将来的にPython側から提供される可能性があるため
 * 型定義として保持
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
 * API選択の戦略
 *
 * QueryOptionsのapiStrategyフィールドで使用
 */
export type ApiStrategy =
  | 'auto'              // 自動判定（デフォルト）
  | 'force-chat'        // 常にchat
  | 'force-completion'; // 常にcompletion
