import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { 
  dialogueBase, 
  firstOfTwoPassResponse, 
  secondOfTwoPassResponse,
  withTalkState 
} from './dialogue';
import type { DialogueContext } from './dialogue';

describe('dialogue modules', () => {
  describe('dialogueBase', () => {
    it('基本的な対話環境を定義する', () => {
      const context: DialogueContext = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      };
      
      const result = compile(dialogueBase, context);
      
      // objectiveセクションの確認
      const objectiveSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Objective and Role'
      );
      expect(objectiveSection).toBeDefined();
      
      // messagesセクションの確認
      const messagesSection = result.data.find(
        e => e.type === 'section' && e.title === 'Messages'
      );
      expect(messagesSection).toBeDefined();
      if (messagesSection?.type === 'section') {
        expect(messagesSection.items).toHaveLength(2);
        expect(messagesSection.items[0]).toContain('[User]: Hello');
        expect(messagesSection.items[1]).toContain('[Assistant]: Hi there!');
      }
    });

    it('rangeを使用してメッセージをスライスできる', () => {
      const context: DialogueContext = {
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
          { role: 'user', content: 'Message 2' },
          { role: 'assistant', content: 'Response 2' }
        ],
        range: { start: 1, end: 3 }
      };
      
      const result = compile(dialogueBase, context);
      const messagesSection = result.data.find(
        e => e.type === 'section' && e.title === 'Messages'
      );
      
      if (messagesSection?.type === 'section') {
        expect(messagesSection.items).toHaveLength(2);
        expect(messagesSection.items[0]).toContain('Response 1');
        expect(messagesSection.items[1]).toContain('Message 2');
      }
    });
  });

  describe('firstOfTwoPassResponse', () => {
    it('Response Preparation Notesを生成する指示を含む', () => {
      const context: DialogueContext = {};
      const result = compile(firstOfTwoPassResponse, context);
      
      // guidelinesセクションの確認
      const guidelinesSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Guidelines'
      );
      expect(guidelinesSection).toBeDefined();
      
      // cueセクションの確認
      const cueSection = result.output.find(
        e => e.type === 'section' && e.title === 'Output'
      );
      expect(cueSection).toBeDefined();
      if (cueSection?.type === 'section') {
        // サブセクションが含まれているか確認
        const subsection = cueSection.items.find(
          item => typeof item === 'object' && item.type === 'subsection'
        );
        expect(subsection).toBeDefined();
        if (subsection && typeof subsection === 'object' && 'title' in subsection) {
          expect(subsection.title).toBe('Response Preparation Notes');
        }
      }
    });
  });

  describe('secondOfTwoPassResponse', () => {
    it('preparationNoteを参照する', () => {
      const context: DialogueContext = {
        preparationNote: {
          content: 'Analysis of user intent...'
        }
      };
      
      const result = compile(secondOfTwoPassResponse, context);
      
      // preparationNoteセクションの確認
      const prepSection = result.instructions.find(
        e => e.type === 'section' && e.title === 'Response Preparation Note'
      );
      expect(prepSection).toBeDefined();
      if (prepSection?.type === 'section') {
        expect(prepSection.items[0]).toContain('Analysis of user intent');
      }
    });
  });

  describe('withTalkState', () => {
    it('会話の状態を保持する', () => {
      const context: DialogueContext = {
        state: {
          content: 'Current conversation summary',
          usage: 100
        }
      };
      
      const result = compile(withTalkState, context);
      
      // stateセクションの確認
      const stateSection = result.data.find(
        e => e.type === 'section' && e.title === 'Current State'
      );
      expect(stateSection).toBeDefined();
      if (stateSection?.type === 'section') {
        expect(stateSection.items[0]).toContain('Current conversation summary');
      }
    });
  });
});