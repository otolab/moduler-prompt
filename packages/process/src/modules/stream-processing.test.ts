import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { streamProcessing, streamProcessingWithSizeControl } from './stream-processing';
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
      
      expect(sectionTitles).toContain('Objective');
      expect(sectionTitles).toContain('Terms');
      expect(sectionTitles).toContain('Instructions');
      expect(sectionTitles).toContain('Cue');
    });

    it('stateがある場合Current Stateセクションを生成', () => {
      const context: StreamProcessingContext = {
        state: {
          content: 'Previous iteration result',
          usage: 150
        }
      };
      
      const result = compile(streamProcessing, context);
      const stateSection = result.data.find(e => e.type === 'section' && e.title === 'State');
      
      expect(stateSection).toBeDefined();
      if (stateSection?.type === 'section') {
        // chunk要素が含まれているか確認
        const chunks = stateSection.items.filter(item => {
          return typeof item === 'object' && 'type' in item && item.type === 'chunk';
        });
        expect(chunks.length).toBeGreaterThan(0);
        
        const firstChunk = chunks[0];
        if (firstChunk && typeof firstChunk === 'object' && 'type' in firstChunk) {
          expect(firstChunk.content).toBe('Previous iteration result');
          expect(firstChunk.usage).toBe(150);
        }
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
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Materials');
      
      expect(materialsSection).toBeDefined();
      if (materialsSection?.type === 'section') {
        // chunk要素が含まれているか確認
        const chunks = materialsSection.items.filter(item => {
          return typeof item === 'object' && 'type' in item && item.type === 'chunk';
        });
        expect(chunks).toHaveLength(2);
        
        const firstChunk = chunks[0];
        if (firstChunk && typeof firstChunk === 'object' && 'type' in firstChunk) {
          expect(firstChunk.content).toBe('Chunk 1 content');
          expect(firstChunk.partOf).toBe('Document A');
          expect(firstChunk.usage).toBe(50);
        }
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
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Materials');
      
      if (materialsSection?.type === 'section') {
        const chunks = materialsSection.items.filter(item => {
          return typeof item === 'object' && 'type' in item && item.type === 'chunk';
        });
        
        expect(chunks).toHaveLength(3); // インデックス1, 2, 3
        if (chunks[0] && typeof chunks[0] === 'object' && 'content' in chunks[0]) {
          expect(chunks[0].content).toBe('Chunk 1');
        }
        if (chunks[2] && typeof chunks[2] === 'object' && 'content' in chunks[2]) {
          expect(chunks[2].content).toBe('Chunk 3');
        }
      }
    });
  });

  describe('streamProcessingWithSizeControl', () => {
    it('streamProcessingの機能を継承', () => {
      const context: StreamProcessingContext = {
        state: { content: 'State' },
        chunks: [{ content: 'Chunk' }]
      };
      
      const result = compile(streamProcessingWithSizeControl, context);
      
      // 基本的なセクションが存在
      const allSections = [
        ...result.instructions,
        ...result.data,
        ...result.output
      ].filter(e => e.type === 'section');
      
      const sectionTitles = allSections.map(s => s.title);
      
      expect(sectionTitles).toContain('Objective');
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
      
      const result = compile(streamProcessingWithSizeControl, context);
      const instructionsSection = result.instructions.find(e => e.type === 'section' && e.title === 'Instructions');
      
      if (instructionsSection?.type === 'section') {
        const instructionTexts = instructionsSection.items
          .filter(item => typeof item === 'string')
          .join(' ');
        
        const hasSizeInstruction = instructionTexts.includes('1000 tokens');
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
      
      const result = compile(streamProcessingWithSizeControl, context);
      const instructionsSection = result.instructions.find(e => e.type === 'section' && e.title === 'Instructions');
      
      if (instructionsSection?.type === 'section') {
        const instructionTexts = instructionsSection.items
          .filter(item => typeof item === 'string')
          .join(' ');
        
        const hasAggressiveReduction = instructionTexts.includes('aggressively reduces');
        expect(hasAggressiveReduction).toBe(true);
      }
    });
  });
});