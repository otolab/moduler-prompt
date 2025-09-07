import { describe, it, expect } from 'vitest';
import { DefaultFormatter, formatPrompt } from './formatter.js';
import type { 
  TextElement, 
  MessageElement, 
  MaterialElement,
  ChunkElement,
  SectionElement,
  SubSectionElement,
  CompiledPrompt
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
    it('should format chunk in markdown', () => {
      const formatter = new DefaultFormatter();
      const element: ChunkElement = {
        type: 'chunk',
        index: 1,
        content: 'First chunk of text'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('#### Chunk 1');
      expect(result).toContain('First chunk of text');
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
        index: 2,
        content: 'Second chunk'
      };
      
      const result = formatter.format(element);
      expect(result).toContain('[BEGIN CHUNK]');
      expect(result).toContain('#### Chunk 2');
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
      index: 1,
      content: 'chunk content'
    };
    const chunkResult = formatter.format(chunk);
    expect(chunkResult).toContain('<<<CHUNK>>>');
    expect(chunkResult).toContain('#### Chunk 1');
    expect(chunkResult).toContain('<<</CHUNK>>>');
  });
  
  it('should handle partial marker configuration', () => {
    const formatter = new DefaultFormatter({
      markers: {
        materialStart: '=== START ===',
        // No materialEnd provided
        chunkEnd: '=== END ==='
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
      index: 1,
      content: 'chunk'
    };
    const chunkResult = formatter.format(chunk);
    expect(chunkResult).not.toContain('=== START ===');
    expect(chunkResult).toContain('#### Chunk 1');
    expect(chunkResult).toContain('=== END ===');
  });
});

describe('preamble and section descriptions', () => {
  it('should add preamble when provided', () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Do something' }
      ],
      data: [],
      output: []
    };
    
    const result = formatPrompt(prompt, {
      preamble: 'This is a custom preamble text.'
    });
    
    expect(result).toContain('This is a custom preamble text.');
    expect(result.indexOf('This is a custom preamble')).toBeLessThan(
      result.indexOf('# Instructions')
    );
  });
  
  it('should add section descriptions when provided', () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Instruction content' }
      ],
      data: [
        { type: 'text', content: 'Data content' }
      ],
      output: [
        { type: 'text', content: 'Output content' }
      ]
    };
    
    const result = formatPrompt(prompt, {
      sectionDescriptions: {
        instructions: 'Custom instructions description',
        data: 'Custom data description',
        output: 'Custom output description'
      }
    });
    
    expect(result).toContain('Custom instructions description');
    expect(result).toContain('Custom data description');
    expect(result).toContain('Custom output description');
    
    // Check order
    const instructionsIndex = result.indexOf('# Instructions');
    const instructionsDescIndex = result.indexOf('Custom instructions description');
    const instructionsContentIndex = result.indexOf('Instruction content');
    
    expect(instructionsIndex).toBeLessThan(instructionsDescIndex);
    expect(instructionsDescIndex).toBeLessThan(instructionsContentIndex);
  });
  
  it('should work with both preamble and section descriptions', () => {
    const prompt: CompiledPrompt = {
      instructions: [
        { type: 'text', content: 'Test' }
      ],
      data: [],
      output: []
    };
    
    const result = formatPrompt(prompt, {
      preamble: 'Preamble text',
      sectionDescriptions: {
        instructions: 'Instructions desc'
      }
    });
    
    expect(result).toContain('Preamble text');
    expect(result).toContain('Instructions desc');
    expect(result.indexOf('Preamble text')).toBeLessThan(
      result.indexOf('# Instructions')
    );
  });
});

describe('formatPrompt', () => {
  it('should format complete prompt with all sections', () => {
    const prompt: CompiledPrompt = {
      instructions: [
        {
          type: 'section',
          title: 'Objective',
          items: ['Process the input', 'Generate output']
        }
      ],
      data: [
        {
          type: 'material',
          id: 'ctx-1',
          title: 'Context',
          content: 'Some context information'
        }
      ],
      output: [
        {
          type: 'text',
          content: 'Please provide the result.'
        }
      ]
    };
    
    const result = formatPrompt(prompt);
    
    expect(result).toContain('# Instructions');
    expect(result).toContain('## Objective');
    expect(result).toContain('- Process the input');
    expect(result).toContain('# Data');
    expect(result).toContain('### Context');
    expect(result).toContain('# Output');
    expect(result).toContain('Please provide the result.');
  });
  
  it('should handle empty sections', () => {
    const prompt: CompiledPrompt = {
      instructions: [],
      data: [
        {
          type: 'text',
          content: 'Some data'
        }
      ],
      output: []
    };
    
    const result = formatPrompt(prompt);
    
    // Empty sections are not included
    expect(result).not.toContain('# Instructions');
    expect(result).toContain('# Data');
    expect(result).toContain('Some data');
    expect(result).not.toContain('# Output');
  });
  
  it('should use custom line breaks', () => {
    const prompt: CompiledPrompt = {
      instructions: [
        {
          type: 'text',
          content: 'Line 1'
        },
        {
          type: 'text',
          content: 'Line 2'
        }
      ],
      data: [],
      output: []
    };
    
    const result = formatPrompt(prompt, { 
      lineBreak: '\r\n'
    });
    
    expect(result).toContain('Line 1\r\nLine 2');
  });
});