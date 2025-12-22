/**
 * ChunkElement Formatter
 */

import type { ChunkElement } from '@modular-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class ChunkElementFormatter extends BaseElementFormatter<ChunkElement> {
  readonly elementType = 'chunk' as const;

  async format(
    element: ChunkElement,
    _specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    // Chunkは構造化データの一部を表す
    return `[Chunk ${element.index}/${element.total} of ${element.partOf}]\n${element.content}\n`;
  }
}