import type { 
  Element, 
  TextElement, 
  MessageElement, 
  MaterialElement,
  ChunkElement,
  SectionElement,
  SubSectionElement
} from '@moduler-prompt/core';
import type { ElementFormatter, FormatterOptions } from './types.js';

/**
 * Default formatter implementation for converting elements to text
 */
export class DefaultFormatter implements ElementFormatter {
  private options: Required<Omit<FormatterOptions, 'preamble' | 'sectionDescriptions' | 'formatter'>> & 
    Pick<FormatterOptions, 'preamble' | 'sectionDescriptions'>;
  
  constructor(options: FormatterOptions = {}) {
    this.options = {
      preamble: options.preamble,
      sectionDescriptions: options.sectionDescriptions,
      markers: {
        sectionStart: options.markers?.sectionStart || '',
        sectionEnd: options.markers?.sectionEnd || '',
        subsectionStart: options.markers?.subsectionStart || '',
        subsectionEnd: options.markers?.subsectionEnd || '',
        materialStart: options.markers?.materialStart || '<material>',
        materialEnd: options.markers?.materialEnd || '</material>',
        chunkStart: options.markers?.chunkStart || '<chunk>',
        chunkEnd: options.markers?.chunkEnd || '</chunk>',
        messageRole: options.markers?.messageRole || '',
        messageContent: options.markers?.messageContent || '',
        ...options.markers
      },
      indent: {
        size: options.indent?.size || 2,
        char: options.indent?.char || ' ',
        ...options.indent
      },
      lineBreak: options.lineBreak || '\n'
    };
  }
  
  format(element: Element): string {
    switch (element.type) {
      case 'text':
        return this.formatText(element);
      case 'message':
        return this.formatMessage(element);
      case 'material':
        return this.formatMaterial(element);
      case 'chunk':
        return this.formatChunk(element);
      case 'section':
        return this.formatSection(element);
      case 'subsection':
        return this.formatSubSection(element);
      default:
        // Type guard exhaustive check
        const _exhaustive: never = element;
        throw new Error(`Unknown element type: ${(_exhaustive as any).type}`);
    }
  }
  
  formatAll(elements: Element[]): string {
    return elements.map(el => this.format(el)).join(this.options.lineBreak);
  }
  
  private formatText(element: TextElement): string {
    return element.content;
  }
  
  private formatMessage(element: MessageElement): string {
    return `**${element.role}**: ${element.content}`;
  }
  
  private formatMaterial(element: MaterialElement): string {
    const { markers, lineBreak } = this.options;
    const lines: string[] = [];
    
    // Handle content which can be string or Attachment[]
    const contentStr = typeof element.content === 'string' 
      ? element.content 
      : JSON.stringify(element.content);
    
    // Add custom markers if provided
    if (markers.materialStart) lines.push(markers.materialStart);
    
    lines.push(`### ${element.title}`);
    if (element.id) {
      lines.push(`*ID: ${element.id}*`);
    }
    if (element.usage) {
      lines.push(`*Usage: ${element.usage} tokens*`);
    }
    lines.push('');
    lines.push(contentStr);
    
    if (markers.materialEnd) lines.push(markers.materialEnd);
    
    return lines.join(lineBreak);
  }
  
  private formatChunk(element: ChunkElement): string {
    const { markers, lineBreak } = this.options;
    const lines: string[] = [];
    
    // Handle content which can be string or Attachment[]
    const contentStr = typeof element.content === 'string' 
      ? element.content 
      : JSON.stringify(element.content);
    
    // Add custom markers if provided
    if (markers.chunkStart) lines.push(markers.chunkStart);
    
    // Format chunk title based on available information
    let chunkTitle: string;
    if (element.index !== undefined && element.total !== undefined) {
      chunkTitle = `#### Chunk ${element.index}/${element.total} of ${element.partOf}`;
    } else if (element.index !== undefined) {
      chunkTitle = `#### Chunk ${element.index} of ${element.partOf}`;
    } else {
      chunkTitle = `#### Part of ${element.partOf}`;
    }
    
    lines.push(chunkTitle);
    lines.push('');
    lines.push(contentStr);
    
    if (markers.chunkEnd) lines.push(markers.chunkEnd);
    
    return lines.join(lineBreak);
  }
  
  private formatSection(element: SectionElement): string {
    const { lineBreak } = this.options;
    const lines: string[] = [];
    
    lines.push(`## ${element.title}`);
    lines.push('');
    
    // Format items
    for (const item of element.items) {
      if (typeof item === 'string') {
        lines.push(`- ${item}`);
      } else if (typeof item === 'function') {
        // Skip DynamicContent functions - they should be resolved before formatting
        continue;
      } else {
        // Subsection element
        const formatted = this.format(item);
        lines.push(...formatted.split(lineBreak).map(line => 
          line.startsWith('#') ? line : `  ${line}`
        ));
      }
    }
    
    return lines.join(lineBreak);
  }
  
  private formatSubSection(element: SubSectionElement): string {
    const { lineBreak } = this.options;
    const lines: string[] = [];
    
    lines.push(`### ${element.title}`);
    lines.push('');
    
    // Format items as bullet list
    for (const item of element.items) {
      lines.push(`- ${item}`);
    }
    
    return lines.join(lineBreak);
  }
}