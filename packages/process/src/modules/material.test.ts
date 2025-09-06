import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { withMaterials, answerWithReferences } from './material';
import type { MaterialContext } from './material';

describe('material modules', () => {
  describe('withMaterials', () => {
    it('材料がない場合は空のコンテンツを返す', () => {
      const context: MaterialContext = {};
      const result = compile(withMaterials, context);
      
      // CompiledPromptオブジェクトが返される
      expect(result).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.output).toBeDefined();
      
      // termsはinstructionsセクションにある
      const termsSection = result.instructions.find(e => e.type === 'section' && e.title === 'Term Explanations');
      expect(termsSection).toBeDefined();
    });

    it('材料がある場合はmaterialセクションを生成', () => {
      const context: MaterialContext = {
        materials: [
          {
            id: 'doc1',
            title: 'Document 1',
            content: 'This is the content of document 1'
          },
          {
            id: 'doc2', 
            title: 'Document 2',
            content: 'This is the content of document 2',
            usage: 100
          }
        ]
      };
      
      const result = compile(withMaterials, context);
      
      // Materialsセクションはdataに含まれる
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Prepared Materials');
      expect(materialsSection).toBeDefined();
      
      if (materialsSection?.type === 'section') {
        // material要素が文字列に変換されているか確認
        const materialTexts = materialsSection.items.filter(item => 
          typeof item === 'string' && item.includes('[Material:')
        );
        expect(materialTexts).toHaveLength(2);
        
        // 最初のmaterialの内容を確認
        expect(materialTexts[0]).toContain('Document 1');
        expect(materialTexts[0]).toContain('This is the content of document 1');
        expect(materialTexts[1]).toContain('Document 2');
        expect(materialTexts[1]).toContain('This is the content of document 2');
      }
    });
  });

  describe('answerWithReferences', () => {
    it('withMaterialsの機能を継承し、追加のinstructionsを持つ', () => {
      const context: MaterialContext = {
        materials: [
          {
            id: 'ref1',
            title: 'Reference 1',
            content: 'Reference content'
          }
        ]
      };
      
      const result = compile(answerWithReferences, context);
      
      // Instructionsセクションを探す
      const instructionsSection = result.instructions.find(e => e.type === 'section' && e.title === 'Instructions');
      expect(instructionsSection).toBeDefined();
      
      if (instructionsSection?.type === 'section') {
        // citation関連の指示が含まれていることを確認
        const instructionTexts = instructionsSection.items
          .filter(item => typeof item === 'string')
          .join(' ');
        
        const hasCitationInstruction = 
          instructionTexts.includes('(refs:') || 
          instructionTexts.includes('learned-knowledge');
        expect(hasCitationInstruction).toBe(true);
      }
      
      // Materialsセクションも存在することを確認
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Prepared Materials');
      expect(materialsSection).toBeDefined();
    });

    it('複数の材料を扱える', () => {
      const context: MaterialContext = {
        materials: [
          { id: 'a', title: 'A', content: 'Content A' },
          { id: 'b', title: 'B', content: 'Content B' },
          { id: 'c', title: 'C', content: 'Content C' }
        ]
      };
      
      const result = compile(answerWithReferences, context);
      const materialsSection = result.data.find(e => e.type === 'section' && e.title === 'Materials');
      
      if (materialsSection?.type === 'section') {
        const materials = materialsSection.items.filter(item => {
          return typeof item === 'object' && 'type' in item && item.type === 'material';
        });
        expect(materials).toHaveLength(3);
      }
    });
  });
});