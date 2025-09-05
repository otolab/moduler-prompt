import { describe, it, expect } from 'vitest';
import { elementsToPromptText, promptTextToMessages } from './converter.js';
import type { Element } from '@moduler-prompt/core';

describe('elementsToPromptText', () => {
  it('converts text elements', () => {
    const elements: Element[] = [
      { type: 'text', content: 'Hello world' },
      { type: 'text', content: 'Second line' }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toBe('Hello world\n\nSecond line');
  });
  
  it('converts message elements', () => {
    const elements: Element[] = [
      { type: 'message', role: 'user', content: 'Hello' },
      { type: 'message', role: 'assistant', content: 'Hi there' }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toBe('User: Hello\n\nAssistant: Hi there');
  });
  
  it('converts material elements', () => {
    const elements: Element[] = [
      {
        type: 'material',
        id: 'mat-1',
        title: 'Reference',
        content: 'Content here',
        usage: 50
      }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toContain('[Material: Reference]');
    expect(result).toContain('ID: mat-1');
    expect(result).toContain('Content here');
    expect(result).toContain('(Usage: 50 tokens)');
  });
  
  it('converts chunk elements', () => {
    const elements: Element[] = [
      {
        type: 'chunk',
        content: 'Chunk content',
        partOf: 'document',
        usage: 100
      }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toContain('[Chunk of document]');
    expect(result).toContain('Chunk content');
    expect(result).toContain('(Usage: 100 tokens)');
  });
  
  it('converts section elements', () => {
    const elements: Element[] = [
      {
        type: 'section',
        content: 'Section content',
        title: 'Instructions',
        items: [
          'First instruction',
          'Second instruction',
          {
            type: 'subsection',
            content: 'Subsection content',
            title: 'Details',
            items: ['Detail 1', 'Detail 2']
          }
        ]
      }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toContain('## Instructions');
    expect(result).toContain('First instruction');
    expect(result).toContain('### Details');
    expect(result).toContain('Detail 1');
  });
  
  it('handles empty elements array', () => {
    const result = elementsToPromptText([]);
    expect(result).toBe('');
  });
  
  it('filters out unknown element types', () => {
    const elements: Element[] = [
      { type: 'text', content: 'Valid' },
      { type: 'unknown' as any, content: 'Invalid' },
      { type: 'text', content: 'Also valid' }
    ];
    
    const result = elementsToPromptText(elements);
    expect(result).toBe('Valid\n\nAlso valid');
  });
});

describe('promptTextToMessages', () => {
  it('converts prompt to system message by default', () => {
    const messages = promptTextToMessages('System prompt');
    expect(messages).toEqual([
      { role: 'system', content: 'System prompt' }
    ]);
  });
  
  it('converts prompt to user message when specified', () => {
    const messages = promptTextToMessages('User prompt', 'user');
    expect(messages).toEqual([
      { role: 'user', content: 'User prompt' }
    ]);
  });
});