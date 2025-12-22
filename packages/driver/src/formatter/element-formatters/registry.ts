/**
 * Element Formatter Registry
 *
 * Element型ごとのフォーマッターを管理
 */

import type { Element } from '@modular-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';
import type { ElementFormatter } from './base.js';

import { TextElementFormatter } from './text.js';
import { MessageElementFormatter } from './message.js';
import { MaterialElementFormatter } from './material.js';
import { ChunkElementFormatter } from './chunk.js';
import { JSONElementFormatter } from './json.js';
import { SectionElementFormatter, SubSectionElementFormatter } from './section.js';

export class ElementFormatterRegistry {
  private formatters: Map<string, ElementFormatter> = new Map();

  constructor(modelName: string) {
    // 各フォーマッターを登録
    this.register(new TextElementFormatter());
    this.register(new MessageElementFormatter(modelName));
    this.register(new MaterialElementFormatter());
    this.register(new ChunkElementFormatter());
    this.register(new JSONElementFormatter());
    this.register(new SubSectionElementFormatter());
    // SectionElementFormatterは自己参照のため最後に登録
    this.register(new SectionElementFormatter(this));
  }

  /**
   * フォーマッターを登録
   */
  register(formatter: ElementFormatter): void {
    this.formatters.set(formatter.elementType, formatter);
  }

  /**
   * 指定された型のフォーマッターを取得
   */
  getFormatter(type: string): ElementFormatter | undefined {
    return this.formatters.get(type);
  }

  /**
   * Elementをフォーマット
   */
  async formatElement(
    element: Element,
    specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    const formatter = this.getFormatter(element.type);

    if (!formatter) {
      // 未知の要素はJSON文字列として扱う
      console.warn(`No formatter found for element type: ${element.type}`);
      return JSON.stringify(element);
    }

    return formatter.format(element as any, specialTokens);
  }

  /**
   * Output要素を特別にフォーマット（schemaがある場合）
   */
  async formatOutputElement(
    element: Element,
    specialTokens: Record<string, SpecialToken | SpecialTokenPair> | undefined,
    hasOutputSchema: boolean
  ): Promise<string> {
    // schema情報がある場合はJSONブロックとしてマーク
    if (hasOutputSchema && element.type === 'text') {
      // コードブロックトークンを使用（JSONは構造化データ）
      let codeBlockStart = '```';
      let codeBlockEnd = '```';

      if (specialTokens?.['code_block_start']) {
        const token = specialTokens['code_block_start'];
        if (typeof token === 'object' && 'text' in token) {
          codeBlockStart = token.text || '```';
        }
      }
      if (specialTokens?.['code_block_end']) {
        const token = specialTokens['code_block_end'];
        if (typeof token === 'object' && 'text' in token) {
          codeBlockEnd = token.text || '```';
        }
      }

      if (codeBlockStart && codeBlockEnd) {
        return `Output Format (JSON):\n${codeBlockStart}json\n${element.content}\n${codeBlockEnd}`;
      }

      // 代替：コードトークンを使用
      const codeToken = specialTokens?.['code'];
      if (codeToken && typeof codeToken === 'object' && 'start' in codeToken && 'end' in codeToken) {
        return `Output Format (JSON):\n${codeToken.start.text}\n${element.content}\n${codeToken.end.text}`;
      }
    }

    return this.formatElement(element, specialTokens);
  }
}