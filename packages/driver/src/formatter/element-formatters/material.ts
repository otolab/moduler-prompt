/**
 * MaterialElement Formatter
 */

import type { MaterialElement } from '@moduler-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class MaterialElementFormatter extends BaseElementFormatter<MaterialElement> {
  readonly elementType = 'material' as const;

  async format(
    element: MaterialElement,
    specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    // materialは主に引用・参照文書として扱う

    // 優先順位: quote > ref > citation > context
    const quoteToken = this.getToken(specialTokens, 'quote');
    if (quoteToken) {
      return `${quoteToken.start}${element.title}\n${element.content}${quoteToken.end}\n`;
    }

    const refToken = this.getToken(specialTokens, 'ref');
    if (refToken) {
      return `${refToken.start}${element.title}\n${element.content}${refToken.end}\n`;
    }

    const citationToken = this.getToken(specialTokens, 'citation');
    if (citationToken) {
      return `${citationToken.start}${element.title}\n${element.content}${citationToken.end}\n`;
    }

    const contextToken = this.getToken(specialTokens, 'context');
    if (contextToken) {
      return `${contextToken.start}Material: ${element.title}\n${element.content}${contextToken.end}\n`;
    }

    // デフォルト（マークダウン引用形式）
    const contentStr = typeof element.content === 'string'
      ? element.content
      : JSON.stringify(element.content);
    const lines = contentStr.split('\n');
    const quotedContent = lines.map((line: string) => `> ${line}`).join('\n');
    return `### ${element.title}\n\n${quotedContent}\n`;
  }
}