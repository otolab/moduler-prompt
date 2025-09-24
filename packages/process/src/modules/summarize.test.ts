import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { summarizeBase, analyzeForSummary, contentSummarize } from './summarize';
import type { SummarizeContext } from './summarize';

describe('summarize modules', () => {
  describe('summarizeBase', () => {
    it('要約処理の基本目的を定義する', () => {
      const context: SummarizeContext = {};
      const result = compile(summarizeBase, context);
      
      const objectiveSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Objective and Role'
      );
      expect(objectiveSection).toBeDefined();
      if (objectiveSection?.type === 'section') {
        expect(objectiveSection.items[0]).toContain('streaming process generates a summary');
      }
    });
  });

  describe('analyzeForSummary', () => {
    it('分析レポート生成の指示を含む', () => {
      const context: SummarizeContext = {};
      const result = compile(analyzeForSummary, context);
      
      // termsセクションの確認
      const termsSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Term Explanations'
      );
      expect(termsSection).toBeDefined();
      if (termsSection?.type === 'section') {
        expect(termsSection.items[0]).toContain('Analysis Report');
      }
      
      // instructionsセクションにAlgorithmサブセクションが含まれる
      const instructionsSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Instructions'
      );
      expect(instructionsSection).toBeDefined();
      if (instructionsSection?.type === 'section') {
        const algorithmSubsection = instructionsSection.items.find(
          item => typeof item === 'object' && item.type === 'subsection' && item.title === 'Algorithm'
        );
        expect(algorithmSubsection).toBeDefined();
      }
    });

    it('セクション定義のガイドラインを含む', () => {
      const context: SummarizeContext = {};
      const result = compile(analyzeForSummary, context);
      
      const guidelinesSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Guidelines'
      );
      expect(guidelinesSection).toBeDefined();
      if (guidelinesSection?.type === 'section') {
        const definitionsSubsection = guidelinesSection.items.find(
          item => typeof item === 'object' && 
                 item.type === 'subsection' && 
                 item.title === 'Section Definitions & Procedures of Analysis Report'
        );
        expect(definitionsSubsection).toBeDefined();
        if (definitionsSubsection && 'items' in definitionsSubsection) {
          expect(definitionsSubsection.items.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('contentSummarize', () => {
    it('コンテンツ要約の指示を含む', () => {
      const context: SummarizeContext = {};
      const result = compile(contentSummarize, context);
      
      // objectiveセクションの確認
      const objectiveSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Objective and Role'
      );
      expect(objectiveSection).toBeDefined();
      if (objectiveSection?.type === 'section') {
        expect(objectiveSection.items[0]).toContain('software engineer');
        expect(objectiveSection.items[1]).toContain('target size');
      }
    });

    it('preparationNoteを参照できる', () => {
      const context: SummarizeContext = {
        preparationNote: {
          content: 'Analysis report content...'
        }
      };
      
      const result = compile(contentSummarize, context);
      
      const textElements = result.instructions.filter(e => e.type === 'text');
      const prepNote = textElements.find(e =>
        e.type === 'text' && e.content.includes('Analysis report content')
      );
      expect(prepNote).toBeDefined();
    });

    it('アルゴリズムのサブセクションを含む', () => {
      const context: SummarizeContext = {};
      const result = compile(contentSummarize, context);
      
      const instructionsSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Instructions'
      );
      expect(instructionsSection).toBeDefined();
      if (instructionsSection?.type === 'section') {
        const algorithmSubsection = instructionsSection.items.find(
          item => typeof item === 'object' && 
                 item.type === 'subsection' && 
                 item.title === 'Algorithm'
        );
        expect(algorithmSubsection).toBeDefined();
        if (algorithmSubsection && 'items' in algorithmSubsection) {
          expect(algorithmSubsection.items).toHaveLength(6);
        }
      }
    });
  });
});