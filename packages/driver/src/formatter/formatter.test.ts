import { describe, it, expect } from 'vitest';
import { DefaultFormatter } from './formatter.js';
import type { 
  TextElement, 
  MessageElement, 
  MaterialElement,
  ChunkElement,
  SectionElement,
  SubSectionElement
} from '@moduler-prompt/core';
import type { SpecialToken, SpecialTokenPair } from './types.js';

describe('DefaultFormatter', () => {
  describe('format text elements', () => {
    it('should format text element', () => {
      const formatter = new DefaultFormatter();
      const element: TextElement = {
        type: 'text',
        content: 'Hello, world!'
      };
      
      expect(formatter.format(element)).toBe('Hello, world!');
    });
  });
  
  describe('format message elements', () => {
    it('should format message in markdown', () => {
      const formatter = new DefaultFormatter();
      const element: MessageElement = {
        type: 'message',
        role: 'user',
        content: 'What is the weather?'
      };
      
      expect(formatter.format(element)).toBe('<!-- begin of USER -->\nWhat is the weather?\n<!-- end of USER -->');
    });
    
    it('should format message with different roles', () => {
      const formatter = new DefaultFormatter();
      
      const userMsg: MessageElement = {
        type: 'message',
        role: 'user',
        content: 'Hello'
      };
      expect(formatter.format(userMsg)).toBe('<!-- begin of USER -->\nHello\n<!-- end of USER -->');
      
      const assistantMsg: MessageElement = {
        type: 'message',
        role: 'assistant',
        content: 'Hi there'
      };
      expect(formatter.format(assistantMsg)).toBe('<!-- begin of ASSISTANT -->\nHi there\n<!-- end of ASSISTANT -->');
      
      const systemMsg: MessageElement = {
        type: 'message',
        role: 'system',
        content: 'You are helpful'
      };
      expect(formatter.format(systemMsg)).toBe('<!-- begin of SYSTEM -->\nYou are helpful\n<!-- end of SYSTEM -->');
    });
  });
  
  describe('format material elements', () => {
    it('should format material in markdown', () => {
      const formatter = new DefaultFormatter();
      const element: MaterialElement = {
        type: 'material',
        id: 'api-doc',
        title: 'API Documentation',
        content: 'This is the API doc content.',
        usage: 100
      };
      
      const result = formatter.format(element);
      expect(result).toContain('### API Documentation');
      expect(result).toContain('*ID: api-doc*');
      expect(result).toContain('*Usage: 100 tokens*');
      expect(result).toContain('This is the API doc content.');
    });
    
    it('should format material with custom markers', () => {
      const formatter = new DefaultFormatter({ 
        markers: {
          materialStart: '<<<MATERIAL>>>',
          materialEnd: '<<</MATERIAL>>>'
        }
      });
      const element: MaterialElement = {
        type: 'material',
        id: 'ref-1',
        title: 'Reference',
        content: 'Reference content'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('<<<MATERIAL>>>');
      expect(result).toContain('### Reference');
      expect(result).toContain('*ID: ref-1*');
      expect(result).toContain('Reference content');
      expect(result).toContain('<<</MATERIAL>>>');
    });
  });
  
  describe('format chunk elements', () => {
    it('should format chunk with index and partOf', () => {
      const formatter = new DefaultFormatter();
      const element: ChunkElement = {
        type: 'chunk',
        partOf: 'document.txt',
        index: 1,
        content: 'First chunk of text'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('#### Chunk 1 of document.txt');
      expect(result).toContain('First chunk of text');
    });
    
    it('should format chunk with index, total, and partOf', () => {
      const formatter = new DefaultFormatter();
      const element: ChunkElement = {
        type: 'chunk',
        partOf: 'large-book.pdf',
        index: 3,
        total: 10,
        content: 'Third chunk of ten'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('#### Chunk 3/10 of large-book.pdf');
      expect(result).toContain('Third chunk of ten');
    });
    
    it('should format chunk without index', () => {
      const formatter = new DefaultFormatter();
      const element: ChunkElement = {
        type: 'chunk',
        partOf: 'large-file.md',
        content: 'Some chunk content'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('#### Part of large-file.md');
      expect(result).toContain('Some chunk content');
    });
    
    it('should format chunk with custom markers', () => {
      const formatter = new DefaultFormatter({
        markers: {
          chunkStart: '[BEGIN CHUNK]',
          chunkEnd: '[END CHUNK]'
        }
      });
      const element: ChunkElement = {
        type: 'chunk',
        partOf: 'data.json',
        index: 2,
        total: 5,
        content: 'Second chunk'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('[BEGIN CHUNK]');
      expect(result).toContain('#### Chunk 2/5 of data.json');
      expect(result).toContain('Second chunk');
      expect(result).toContain('[END CHUNK]');
    });
  });
  
  describe('format section elements', () => {
    it('should format section with string items as bullet list', () => {
      const formatter = new DefaultFormatter();
      const element: SectionElement = {
        type: 'section',
        title: 'Instructions',
        items: ['Do this', 'Then that', 'Finally this']
      };
      
      const result = formatter.format(element);
      expect(result).toContain('## Instructions');
      expect(result).toContain('- Do this');
      expect(result).toContain('- Then that');
      expect(result).toContain('- Finally this');
    });
    
    it('should format section with subsection', () => {
      const formatter = new DefaultFormatter();
      const subsection: SubSectionElement = {
        type: 'subsection',
        title: 'Details',
        items: ['Detail 1', 'Detail 2']
      };
      const element: SectionElement = {
        type: 'section',
        title: 'Main Section',
        items: ['Item 1', subsection]
      };
      
      const result = formatter.format(element);
      expect(result).toContain('## Main Section');
      expect(result).toContain('- Item 1');
      expect(result).toContain('### Details');
      expect(result).toContain('- Detail 1');
      expect(result).toContain('- Detail 2');
    });
  });
  
  describe('format subsection elements', () => {
    it('should format subsection as nested list', () => {
      const formatter = new DefaultFormatter();
      const element: SubSectionElement = {
        type: 'subsection',
        title: 'Sub Tasks',
        items: ['Task A', 'Task B', 'Task C']
      };
      
      const result = formatter.format(element);
      expect(result).toContain('### Sub Tasks');
      expect(result).toContain('- Task A');
      expect(result).toContain('- Task B');
      expect(result).toContain('- Task C');
    });
  });
});

describe('markers usage', () => {
  it('should use material and chunk markers', () => {
    const formatter = new DefaultFormatter({
      markers: {
        materialStart: '<<<MATERIAL>>>',
        materialEnd: '<<</MATERIAL>>>',
        chunkStart: '<<<CHUNK>>>',
        chunkEnd: '<<</CHUNK>>>'
      }
    });
    
    // Test material markers
    const material: MaterialElement = {
      type: 'material',
      id: 'mat1',
      title: 'Test Material',
      content: 'material content'
    };
    const materialResult = formatter.format(material);
    expect(materialResult).toContain('<<<MATERIAL>>>');
    expect(materialResult).toContain('### Test Material');
    expect(materialResult).toContain('<<</MATERIAL>>>');
    
    // Test chunk markers
    const chunk: ChunkElement = {
      type: 'chunk',
      partOf: 'file.txt',
      index: 1,
      content: 'chunk content'
    };
    const chunkResult = formatter.format(chunk);
    expect(chunkResult).toContain('<<<CHUNK>>>');
    expect(chunkResult).toContain('#### Chunk 1 of file.txt');
    expect(chunkResult).toContain('<<</CHUNK>>>');
  });
  
  it('should handle partial marker configuration', () => {
    const formatter = new DefaultFormatter({
      markers: {
        materialStart: '=== START ===',
        // No materialEnd provided
        chunkEnd: '=== END ===',
        // No chunkStart provided
      }
    });
    
    // Material with only start marker
    const material: MaterialElement = {
      type: 'material',
      id: 'mat1',
      title: 'Title',
      content: 'content'
    };
    const materialResult = formatter.format(material);
    expect(materialResult).toContain('=== START ===');
    expect(materialResult).toContain('### Title');
    expect(materialResult).not.toContain('=== END ===');
    
    // Chunk with only end marker
    const chunk: ChunkElement = {
      type: 'chunk',
      partOf: 'data.txt',
      index: 1,
      content: 'chunk'
    };
    const chunkResult = formatter.format(chunk);
    expect(chunkResult).not.toContain('=== START ===');
    expect(chunkResult).toContain('#### Chunk 1 of data.txt');
    expect(chunkResult).toContain('=== END ===');
  });
});

describe('DefaultFormatter with Special Tokens', () => {
  describe('setSpecialTokens', () => {
    it('should update markers based on special tokens', () => {
      const formatter = new DefaultFormatter();
      
      const specialTokens = {
        system: {
          start: { text: '<|system|>', id: 1 },
          end: { text: '<|/system|>', id: 2 }
        } as SpecialTokenPair,
        code: {
          start: { text: '<|code_start|>', id: 7 },
          end: { text: '<|code_end|>', id: 8 }
        } as SpecialTokenPair,
        thinking: {
          start: { text: '<|thinking|>', id: 9 },
          end: { text: '</thinking>', id: 10 }
        } as SpecialTokenPair
      };

      formatter.setSpecialTokens(specialTokens);

      // Test that markers are updated
      const section: SectionElement = {
        type: 'section',
        title: 'Test Section',
        items: ['Item 1', 'Item 2']
      };

      const formatted = formatter.format(section);
      expect(formatted).toContain('## Test Section');
    });
  });

  describe('formatting with special tokens', () => {
    it('should use code tokens for material elements', () => {
      const formatter = new DefaultFormatter({
        markers: {
          materialStart: '',
          materialEnd: ''
        }
      });

      const specialTokens = {
        code: {
          start: { text: '<|code_start|>', id: 7 },
          end: { text: '<|code_end|>', id: 8 }
        } as SpecialTokenPair
      };

      formatter.setSpecialTokens(specialTokens);

      const material: MaterialElement = {
        type: 'material',
        title: 'Code Example',
        content: 'console.log("Hello");'
      };

      const formatted = formatter.format(material);
      expect(formatted).toContain('<|code_start|>');
      expect(formatted).toContain('<|code_end|>');
      expect(formatted).toContain('console.log("Hello");');
    });

    it('should use thinking tokens for subsections', () => {
      const formatter = new DefaultFormatter({
        markers: {
          subsectionStart: '',
          subsectionEnd: ''
        }
      });

      const specialTokens = {
        thinking: {
          start: { text: '<|thinking|>', id: 9 },
          end: { text: '</thinking>', id: 10 }
        } as SpecialTokenPair
      };

      formatter.setSpecialTokens(specialTokens);

      const subsection: SubSectionElement = {
        type: 'subsection',
        title: 'Analysis',
        items: ['Point 1', 'Point 2']
      };

      const formatted = formatter.format(subsection);
      expect(formatted).toContain('<|thinking|>');
      expect(formatted).toContain('</thinking>');
      expect(formatted).toContain('Point 1');
      expect(formatted).toContain('Point 2');
    });

    it('should handle mixed single and paired tokens', () => {
      const formatter = new DefaultFormatter();

      const specialTokens = {
        eod: { text: '<|endoftext|>', id: 0 } as SpecialToken,
        system: {
          start: { text: '<|system|>', id: 1 },
          end: { text: '<|/system|>', id: 2 }
        } as SpecialTokenPair
      };

      formatter.setSpecialTokens(specialTokens);

      const section: SectionElement = {
        type: 'section',
        title: 'Instructions',
        items: ['Do this', 'Do that']
      };

      const formatted = formatter.format(section);
      expect(formatted).toBeDefined();
      expect(formatted).toContain('## Instructions');
    });

    it('should preserve existing markers if special tokens are not provided', () => {
      const formatter = new DefaultFormatter({
        markers: {
          materialStart: '<custom-start>',
          materialEnd: '<custom-end>'
        }
      });

      const specialTokens = {
        thinking: {
          start: { text: '<|thinking|>', id: 9 },
          end: { text: '</thinking>', id: 10 }
        } as SpecialTokenPair
      };

      formatter.setSpecialTokens(specialTokens);

      const material: MaterialElement = {
        type: 'material',
        title: 'Data',
        content: 'Some data'
      };

      const formatted = formatter.format(material);
      // Should keep custom markers since code tokens were not provided
      expect(formatted).toContain('<custom-start>');
      expect(formatted).toContain('<custom-end>');
    });
  });
});