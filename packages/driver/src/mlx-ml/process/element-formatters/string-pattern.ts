/**
 * 文字列パターンから特殊トークンを適用するフォーマッター
 *
 * compileが生成した文字列化されたElement表現を認識し、
 * 適切な特殊トークンでラップする
 */

import type { MlxCapabilities } from '../types.js';

export class StringPatternFormatter {
  constructor(private specialTokens?: MlxCapabilities['special_tokens']) {}

  /**
   * 文字列化されたElementパターンを認識して特殊トークンを適用
   */
  format(content: string): string {
    if (!this.specialTokens) {
      return content;
    }

    let result = content;

    // JSONブロックパターン: ```json ... ```
    if (result.includes('```json')) {
      result = this.applyJsonTokens(result);
    }

    // Materialパターン: [Material: Title]
    if (result.includes('[Material:')) {
      result = this.applyMaterialTokens(result);
    }

    // Chunkパターン: [Chunk from ...]
    if (result.includes('[Chunk from')) {
      result = this.applyChunkTokens(result);
    }

    // Messageパターン: [Role]: content
    result = this.applyMessageTokens(result);

    return result;
  }

  private applyJsonTokens(content: string): string {
    // コードブロックトークンが利用可能な場合
    const codeBlockStart = this.getToken('code_block_start');
    const codeBlockEnd = this.getToken('code_block_end');

    if (codeBlockStart && codeBlockEnd) {
      // ```json を特殊トークンに置換
      return content.replace(/```json/g, `${codeBlockStart}json`)
                   .replace(/```/g, codeBlockEnd);
    }

    return content;
  }

  private applyMaterialTokens(content: string): string {
    // 引用トークンが利用可能な場合
    const quoteToken = this.getTokenPair('quote');
    if (quoteToken) {
      // [Material: Title]\nContent パターンを検出
      const pattern = /\[Material: ([^\]]+)\]\n([\s\S]*?)(?=\n\[|$)/g;
      return content.replace(pattern, (_, title, materialContent) => {
        return `${quoteToken.start}${title}\n${materialContent}${quoteToken.end}`;
      });
    }

    // 参照トークンが利用可能な場合
    const refToken = this.getTokenPair('ref');
    if (refToken) {
      const pattern = /\[Material: ([^\]]+)\]\n([\s\S]*?)(?=\n\[|$)/g;
      return content.replace(pattern, (_, title, materialContent) => {
        return `${refToken.start}${title}\n${materialContent}${refToken.end}`;
      });
    }

    return content;
  }

  private applyChunkTokens(content: string): string {
    // contextトークンが利用可能な場合
    const contextToken = this.getTokenPair('context');
    if (contextToken) {
      const pattern = /\[Chunk from ([^\]]+)\]\n([\s\S]*?)(?=\n\[|$)/g;
      return content.replace(pattern, (_, partOf, chunkContent) => {
        return `${contextToken.start}Chunk from ${partOf}\n${chunkContent}${contextToken.end}`;
      });
    }

    return content;
  }

  private applyMessageTokens(content: string): string {
    // [System]: content パターン
    const systemToken = this.getTokenPair('system');
    if (systemToken) {
      content = content.replace(/\[System\]: (.*)/g, (_, msg) => {
        return `${systemToken.start}${msg}${systemToken.end}`;
      });
    }

    // [User]: content パターン
    const userToken = this.getTokenPair('user');
    if (userToken) {
      content = content.replace(/\[User\]: (.*)/g, (_, msg) => {
        return `${userToken.start}${msg}${userToken.end}`;
      });
    }

    // [Assistant]: content パターン
    const assistantToken = this.getTokenPair('assistant');
    if (assistantToken) {
      content = content.replace(/\[Assistant\]: (.*)/g, (_, msg) => {
        return `${assistantToken.start}${msg}${assistantToken.end}`;
      });
    }

    return content;
  }

  private getToken(name: string): string | null {
    if (!this.specialTokens) return null;
    const token = this.specialTokens[name];
    if (token && typeof token === 'object' && 'text' in token) {
      return token.text || null;
    }
    return null;
  }

  private getTokenPair(name: string): { start: string; end: string } | null {
    if (!this.specialTokens) return null;
    const token = this.specialTokens[name];
    if (token && typeof token === 'object' && 'start' in token && 'end' in token) {
      return {
        start: token.start.text || '',
        end: token.end.text || ''
      };
    }
    return null;
  }
}