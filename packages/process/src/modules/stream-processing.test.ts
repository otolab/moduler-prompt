import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { streamProcessing } from './stream-processing';
import type { StreamProcessingContext } from './stream-processing';

describe('stream-processing modules', () => {
  describe('streamProcessing', () => {
    it('基本的な構造を持つ', () => {
      const context: StreamProcessingContext = {};
      const result = compile(streamProcessing, context);
      
      // 必須セクションが存在することを確認
      const allSections = [
        ...result.instructions,
        ...result.data,
        ...result.output
      ].filter(e => e.type === 'section');
      
      const sectionTitles = allSections.map(s => s.title);
      
      expect(sectionTitles).toContain('Objective and Role');
      expect(sectionTitles).toContain('Term Explanations');
      expect(sectionTitles).toContain('Processing Methodology');
      expect(sectionTitles).toContain('Instructions');
      expect(sectionTitles).toContain('Output');
    });

    it('stateがある場合Current Stateセクションを生成', () => {
      const context: StreamProcessingContext = {
        state: {
          content: 'Previous iteration result',
          usage: 150
        }
      };
      
      const result = compile(streamProcessing, context);
      const stateSection = result.data.find(e => e.type === 'section' && e.title === 'Current State');
      
      expect(stateSection).toBeDefined();
      if (stateSection?.type === 'section') {
        // chunk要素が文字列に変換されているか確認
        const stateText = stateSection.items.find(item => 
          typeof item === 'string' && item.includes('[Chunk from state]')
        );
        expect(stateText).toBeDefined();
        expect(stateText).toContain('Previous iteration result');
      }
    });

    it('chunksがある場合Input Chunksセクションを生成', () => {
      const context: StreamProcessingContext = {
        chunks: [
          {
            content: 'Chunk 1 content',
            partOf: 'Document A',
            usage: 50
          },
          {
            content: 'Chunk 2 content',
            partOf: 'Document B',
            usage: 75,
            attachments: [{ type: 'image', url: 'image.png' }]
          }
        ]
      };
      
      const result = compile(streamProcessing, context);
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Prepared Materials');
      
      expect(materialsSection).toBeDefined();
      if (materialsSection?.type === 'section') {
        // chunk要素が文字列に変換されているか確認
        const chunkTexts = materialsSection.items.filter(item => 
          typeof item === 'string' && item.includes('[Chunk from')
        );
        expect(chunkTexts).toHaveLength(2);
        
        expect(chunkTexts[0]).toContain('Chunk 1 content');
        expect(chunkTexts[0]).toContain('Document A');
        expect(chunkTexts[1]).toContain('Chunk 2 content');
        expect(chunkTexts[1]).toContain('Document B');
      }
    });

    it('rangeを使用してchunksをスライスできる', () => {
      const context: StreamProcessingContext = {
        chunks: [
          { content: 'Chunk 0' },
          { content: 'Chunk 1' },
          { content: 'Chunk 2' },
          { content: 'Chunk 3' },
          { content: 'Chunk 4' }
        ],
        range: {
          start: 1,
          end: 4
        }
      };
      
      const result = compile(streamProcessing, context);
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Prepared Materials');
      
      if (materialsSection?.type === 'section') {
        const chunkTexts = materialsSection.items.filter(item => 
          typeof item === 'string' && item.includes('[Chunk from')
        );
        
        expect(chunkTexts).toHaveLength(3); // インデックス1, 2, 3
        expect(chunkTexts[0]).toContain('Chunk 1');
        expect(chunkTexts[2]).toContain('Chunk 3');
      }
    });
  });

  describe('streamProcessing with targetTokens', () => {
    it('targetTokensが設定されている場合サイズ制御の指示を追加', () => {
      const context: StreamProcessingContext = {
        state: { content: 'State' },
        chunks: [{ content: 'Chunk' }]
      };
      
      const result = compile(streamProcessing, context);
      
      // 基本的なセクションが存在
      const allSections = [
        ...result.instructions,
        ...result.data,
        ...result.output
      ].filter(e => e.type === 'section');
      
      const sectionTitles = allSections.map(s => s.title);
      
      expect(sectionTitles).toContain('Objective and Role');
      expect(sectionTitles).toContain('Processing Methodology');
      expect(sectionTitles).toContain('Instructions');
      expect(sectionTitles).toContain('Guidelines'); // 追加のガイドライン
    });

    it('targetTokensが設定されている場合サイズ制御の指示を追加', () => {
      const context: StreamProcessingContext = {
        targetTokens: 1000,
        state: {
          content: 'Large state content',
          usage: 500
        }
      };
      
      const result = compile(streamProcessing, context);
      const methodologySection = result.instructions.find(e => e.type === 'section' && e.title === 'Processing Methodology');
      
      if (methodologySection?.type === 'section') {
        const methodologyTexts = methodologySection.items
          .map(item => typeof item === 'string' ? item : (item.type === 'text' ? item.content : ''))
          .join(' ');
        
        const hasSizeInstruction = methodologyTexts.includes('1000 tokens');
        expect(hasSizeInstruction).toBe(true);
      }
    });

    it('使用量が閾値を超える場合は積極的な削減を指示', () => {
      const context: StreamProcessingContext = {
        targetTokens: 1000,
        state: {
          content: 'Very large state',
          usage: 900 // 0.8 * 1000 = 800を超えている
        }
      };
      
      const result = compile(streamProcessing, context);
      const methodologySection = result.instructions.find(e => e.type === 'section' && e.title === 'Processing Methodology');
      
      if (methodologySection?.type === 'section') {
        const methodologyTexts = methodologySection.items
          .map(item => typeof item === 'string' ? item : (item.type === 'text' ? item.content : ''))
          .join(' ');
        
        const hasAggressiveReduction = methodologyTexts.includes('aggressively reduce');
        expect(hasAggressiveReduction).toBe(true);
      }
    });
  });

  describe('streamProcessing with range', () => {
    it('最初のイテレーションの場合、初期化の指示を生成', () => {
      const context: StreamProcessingContext = {
        chunks: [{ content: 'chunk1' }, { content: 'chunk2' }],
        range: { start: 0, end: 1 }
      };
      
      const result = compile(streamProcessing, context);
      
      // objectiveに最初のイテレーション情報が含まれているか確認
      const objectiveSection = result.instructions.find(e => e.type === 'section' && e.title === 'Objective and Role');
      if (objectiveSection?.type === 'section') {
        const objectiveTexts = objectiveSection.items
          .filter(item => typeof item === 'string')
          .join(' ');
        
        expect(objectiveTexts).toContain('first iteration');
      }
    });

    it('最終イテレーションの場合、特別な指示を生成', () => {
      const context: StreamProcessingContext = {
        chunks: [{ content: 'chunk1' }, { content: 'chunk2' }, { content: 'chunk3' }],
        range: { start: 2, end: 3 } // end === chunks.length
      };
      
      const result = compile(streamProcessing, context);
      
      const objectiveSection = result.instructions.find(e => e.type === 'section' && e.title === 'Objective and Role');
      if (objectiveSection?.type === 'section') {
        const objectiveTexts = objectiveSection.items
          .filter(item => typeof item === 'string')
          .join(' ');
        
        expect(objectiveTexts).toContain('final iteration');
      }
    });
  });
});