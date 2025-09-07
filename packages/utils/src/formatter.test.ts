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
      
      expect(formatter.format(element)).toBe('**user**: What is the weather?');
    });
    
    it('should format message with different roles', () => {
      const formatter = new DefaultFormatter();
      
      const userMsg: MessageElement = {
        type: 'message',
        role: 'user',
        content: 'Hello'
      };
      expect(formatter.format(userMsg)).toBe('**user**: Hello');
      
      const assistantMsg: MessageElement = {
        type: 'message',
        role: 'assistant',
        content: 'Hi there'
      };
      expect(formatter.format(assistantMsg)).toBe('**assistant**: Hi there');
      
      const systemMsg: MessageElement = {
        type: 'message',
        role: 'system',
        content: 'You are helpful'
      };
      expect(formatter.format(systemMsg)).toBe('**system**: You are helpful');
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