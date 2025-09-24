/**
 * MessageElement Formatter
 */

import type { MessageElement } from '@moduler-prompt/core';
import type { MlxCapabilities } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class MessageElementFormatter extends BaseElementFormatter<MessageElement> {
  readonly elementType = 'message' as const;

  constructor(private modelName: string) {
    super();
  }

  async format(
    element: MessageElement,
    specialTokens?: MlxCapabilities['special_tokens']
  ): Promise<string> {
    // 特殊トークンが利用可能な場合は使用
    if (specialTokens) {
      const roleTokens = this.getToken(specialTokens, element.role);
      if (roleTokens) {
        return `${roleTokens.start}${element.content}${roleTokens.end}\n`;
      }
    }

    // モデル固有のフォールバック処理
    if (this.modelName.includes('gemma-3')) {
      const roleMap = {
        system: 'user',  // Gemma-3はsystemロールをサポートしない
        user: 'user',
        assistant: 'model'
      };
      const role = roleMap[element.role as keyof typeof roleMap] || 'user';
      // Gemma-3のデフォルトトークン
      return `<start_of_turn>${role}\n${element.content}<end_of_turn>\n`;
    }

    // デフォルトは通常のテキスト形式
    return `[${element.role.toUpperCase()}]\n${element.content}\n`;
  }
}