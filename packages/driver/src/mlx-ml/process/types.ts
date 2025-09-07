/**
 * MLX Driver API v2.0 型定義
 */
import type { MlxMlModelOptions } from '../types.js';

export type { MlxMlModelOptions };

export interface MlxMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// API v2.0 リクエスト型定義
export interface MlxBaseRequest {
  method: 'capabilities' | 'format_test' | 'chat' | 'completion';
}

export interface MlxCapabilitiesRequest extends MlxBaseRequest {
  method: 'capabilities';
}

export interface MlxFormatTestRequest extends MlxBaseRequest {
  method: 'format_test';
  messages: MlxMessage[];
  options?: {
    primer?: string;
  };
}

export interface MlxChatRequest extends MlxBaseRequest {
  method: 'chat';
  messages: MlxMessage[];
  primer?: string;
  options?: MlxMlModelOptions;
}

export interface MlxCompletionRequest extends MlxBaseRequest {
  method: 'completion';
  prompt: string;
  options?: MlxMlModelOptions;
}

export type MlxRequest = MlxCapabilitiesRequest | MlxFormatTestRequest | MlxChatRequest | MlxCompletionRequest;

// API v2.0 レスポンス型定義
export interface SpecialToken {
  text: string;
  id: number;
}

export interface SpecialTokenPair {
  start: SpecialToken;
  end: SpecialToken;
}

export interface ChatTemplateInfo {
  template_string?: string;
  supported_roles: string[];
  preview?: string;
  constraints: Record<string, unknown>;
}

export interface MlxCapabilities {
  methods: string[];
  special_tokens: Record<string, SpecialToken | SpecialTokenPair>;
  features: {
    apply_chat_template: boolean;
    vocab_size?: number;
    model_max_length?: number;
    chat_template?: ChatTemplateInfo;
  };
}

export interface MlxFormatTestResult {
  formatted_prompt: string | null;
  template_applied: boolean;
  model_specific_processing: MlxMessage[] | null;
  error: string | null;
}

// レガシー互換性のための型
export interface LegacyMlxRequest {
  messages: MlxMessage[];
  prompt?: string;
  primer?: string;
  options?: MlxMlModelOptions;
}

// 内部用型定義
export interface BaseQueueItem {
  request: MlxRequest | LegacyMlxRequest;
  expectJsonResponse?: boolean;
}

export interface CapabilitiesQueueItem extends BaseQueueItem {
  request: MlxCapabilitiesRequest;
  resolve: (value: MlxCapabilities) => void;
  expectJsonResponse: true;
}

export interface FormatTestQueueItem extends BaseQueueItem {
  request: MlxFormatTestRequest;
  resolve: (value: MlxFormatTestResult) => void;
  expectJsonResponse: true;
}

export interface StreamingQueueItem extends BaseQueueItem {
  request: MlxChatRequest | MlxCompletionRequest | LegacyMlxRequest;
  resolve: (value: Readable) => void;
  expectJsonResponse?: false;
}

export type QueueItem = CapabilitiesQueueItem | FormatTestQueueItem | StreamingQueueItem;

// Node.js stream import
import { Readable } from 'stream';