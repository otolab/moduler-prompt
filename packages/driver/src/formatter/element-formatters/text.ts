/**
 * TextElement Formatter
 */

import type { TextElement } from '@moduler-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class TextElementFormatter extends BaseElementFormatter<TextElement> {
  readonly elementType = 'text' as const;

  async format(
    element: TextElement,
    _specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    return element.content;
  }
}