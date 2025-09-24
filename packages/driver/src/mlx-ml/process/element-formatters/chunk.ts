/**
 * ChunkElement Formatter
 */

import type { ChunkElement } from '@moduler-prompt/core';
import type { MlxCapabilities } from '../types.js';
import { BaseElementFormatter } from './base.js';

export class ChunkElementFormatter extends BaseElementFormatter<ChunkElement> {
  readonly elementType = 'chunk' as const;

  async format(
    element: ChunkElement,
    _specialTokens?: MlxCapabilities['special_tokens']
  ): Promise<string> {
    // Chunkは構造化データの一部を表す
    return `[Chunk ${element.index}/${element.total} of ${element.partOf}]\n${element.content}\n`;
  }
}