/**
 * JSONElement Formatter
 */

import type { JSONElement } from '@moduler-prompt/core';
import type { MlxCapabilities } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class JSONElementFormatter extends BaseElementFormatter<JSONElement> {
  readonly elementType = 'json' as const;

  async format(
    element: JSONElement,
    specialTokens?: MlxCapabilities['special_tokens']
  ): Promise<string> {
    // JSONスキーマ要素は構造化データとして明確にマーク
    const jsonContent = typeof element.content === 'string'
      ? element.content
      : JSON.stringify(element.content, null, 2);

    // コードブロックトークンを使用
    const codeBlockStart = this.getSingleToken(specialTokens, 'code_block_start') || '```';
    const codeBlockEnd = this.getSingleToken(specialTokens, 'code_block_end') || '```';

    if (codeBlockStart && codeBlockEnd) {
      return `JSON Schema:\n${codeBlockStart}json\n${jsonContent}\n${codeBlockEnd}\n`;
    }

    // 代替：codeトークンを使用
    const codeToken = this.getToken(specialTokens, 'code');
    if (codeToken) {
      return `JSON Schema:\n${codeToken.start}\n${jsonContent}\n${codeToken.end}\n`;
    }

    // デフォルト
    return `JSON Schema:\n\`\`\`json\n${jsonContent}\n\`\`\`\n`;
  }
}