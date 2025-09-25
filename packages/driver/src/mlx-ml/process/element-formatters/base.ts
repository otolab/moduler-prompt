/**
 * Element Formatter基底インターフェース
 */

import type { Element } from '@moduler-prompt/core';
import type { MlxCapabilities } from '../types.js';

export interface ElementFormatter<T extends Element = Element> {
  /**
   * このフォーマッターが処理できるElement型
   */
  readonly elementType: T['type'];

  /**
   * Elementを文字列にフォーマット
   */
  format(element: T, specialTokens?: MlxCapabilities['special_tokens']): Promise<string>;
}

/**
 * Element Formatter基底クラス
 */
export abstract class BaseElementFormatter<T extends Element = Element>
  implements ElementFormatter<T> {

  abstract readonly elementType: T['type'];

  abstract format(
    element: T,
    specialTokens?: MlxCapabilities['special_tokens']
  ): Promise<string>;

  /**
   * 特殊トークンのヘルパーメソッド
   */
  protected getToken(
    specialTokens: MlxCapabilities['special_tokens'] | undefined,
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
    specialTokens: MlxCapabilities['special_tokens'] | undefined,
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