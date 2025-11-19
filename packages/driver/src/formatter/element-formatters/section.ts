/**
 * SectionElement and SubSectionElement Formatters
 */

import type { SectionElement, SubSectionElement } from '@moduler-prompt/core';
import type { SpecialToken, SpecialTokenPair } from '../types.js';
import { BaseElementFormatter } from './base.js';
import type { ElementFormatterRegistry } from './registry.js';
import { StringPatternFormatter } from './string-pattern.js';

export class SectionElementFormatter extends BaseElementFormatter<SectionElement> {
  readonly elementType = 'section' as const;

  constructor(private registry: ElementFormatterRegistry) {
    super();
  }

  async format(
    element: SectionElement,
    specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    // 文字列パターンフォーマッターを作成
    const patternFormatter = new StringPatternFormatter(specialTokens);

    const sectionItems = await Promise.all(
      element.items.map(async item => {
        if (typeof item === 'string') {
          // compileが生成した文字列化されたElement表現に特殊トークンを適用
          return patternFormatter.format(item);
        } else if ('type' in item && item.type === 'subsection') {
          const formatter = this.registry.getFormatter('subsection');
          return formatter ? await formatter.format(item, specialTokens) : '';
        } else {
          // DynamicContentは既にコンパイル時に解決されているはず
          return '';
        }
      })
    );
    const sectionContent = sectionItems.join('\n');

    // headingトークンが利用可能な場合
    const headingToken = this.getToken(specialTokens, 'heading');
    if (headingToken) {
      return `${headingToken.start}${element.title}${headingToken.end}\n${sectionContent}\n`;
    }

    return `=== ${element.title} ===\n${sectionContent}\n`;
  }
}

export class SubSectionElementFormatter extends BaseElementFormatter<SubSectionElement> {
  readonly elementType = 'subsection' as const;

  async format(
    element: SubSectionElement,
    _specialTokens?: Record<string, SpecialToken | SpecialTokenPair>
  ): Promise<string> {
    const subsectionContent = element.items.join('\n');
    return `--- ${element.title} ---\n${subsectionContent}\n`;
  }
}