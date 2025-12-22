/**
 * Element Formatter基底インターフェース
 */

import type { Element } from '@modular-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';

export interface ElementFormatter<T extends Element = Element> {
  /**
   * このフォーマッターが処理できるElement型
   */
  readonly elementType: T['type'];

  /**
   * Elementを文字列にフォーマット
   */
  format(element: T, specialTokens?: Record<string, SpecialToken | SpecialTokenPair>): Promise<string>;
}

/**
 * Element Formatter基底クラス
 */
export abstract class BaseElementFormatter<T extends Element = Element>
  implements ElementFormatter<T> {

  abstract readonly elementType: T['type'];

  abstract format(
    element: T,
    specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string>;

  /**
   * 特殊トークンのヘルパーメソッド
   */
  protected getToken(
    specialTokens: Record<string, SpecialToken | SpecialTokenPair> | undefined,
    tokenName: string
  ): { start: string; end: string } | null {
    if (!specialTokens) return null;

    const token = specialTokens[tokenName];
    if (token && typeof token === 'object' && 'start' in token && 'end' in token) {
      return {
        start: token.start.text || '',
        end: token.end.text || ''
      };
    }

    return null;
  }

  /**
   * 単一トークンのヘルパーメソッド
   */
  protected getSingleToken(
    specialTokens: Record<string, SpecialToken | SpecialTokenPair> | undefined,
    tokenName: string
  ): string | null {
    if (!specialTokens) return null;

    const token = specialTokens[tokenName];
    if (token && typeof token === 'object' && 'text' in token) {
      return token.text || null;
    }

    return null;
  }
}