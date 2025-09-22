import type {
  Element,
  TextElement,
  MessageElement,
  MaterialElement,
  ChunkElement,
  SectionElement,
  SubSectionElement,
  JSONElement
} from '@moduler-prompt/core';
import type { ElementFormatter, FormatterOptions, SpecialToken, SpecialTokenPair } from './types.js';

/**
 * Default formatter implementation for converting elements to text
 */
export class DefaultFormatter implements ElementFormatter {
  private options: Required<Omit<FormatterOptions, 'preamble' | 'sectionDescriptions' | 'formatter' | 'specialTokens'>> & 
    Pick<FormatterOptions, 'preamble' | 'sectionDescriptions' | 'specialTokens'>;
  private specialTokens?: Record<string, SpecialToken | SpecialTokenPair>;
  
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
      lineBreak: options.lineBreak || '\n',
      specialTokens: options.specialTokens
    };
    this.specialTokens = options.specialTokens;
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
      case 'json':
        return this.formatJSONElement(element);
      default: {
        // Type guard exhaustive check
        const _exhaustive: never = element;
        throw new Error(`Unknown element type: ${(_exhaustive as unknown as { type: string }).type}`);
      }
    }
  }
  
  formatAll(elements: Element[]): string {
    return elements.map(el => this.format(el)).join(this.options.lineBreak);
  }
  
  setSpecialTokens(tokens: Record<string, SpecialToken | SpecialTokenPair>): void {
    this.specialTokens = tokens;
    this.options.specialTokens = tokens;
    // Update markers if special tokens are provided
    if (tokens) {
      this.updateMarkersFromSpecialTokens(tokens);
    }
  }
  
  private updateMarkersFromSpecialTokens(tokens: Record<string, SpecialToken | SpecialTokenPair>): void {
    // Auto-configure markers based on special tokens if available
    const markers = this.options.markers;
    
    // Update section markers if tokens are available
    if (tokens.system && this.isTokenPair(tokens.system)) {
      markers.sectionStart = markers.sectionStart || tokens.system.start.text;
      markers.sectionEnd = markers.sectionEnd || tokens.system.end.text;
    }
    
    // Update code block markers
    if (tokens.code && this.isTokenPair(tokens.code)) {
      markers.materialStart = markers.materialStart || tokens.code.start.text;
      markers.materialEnd = markers.materialEnd || tokens.code.end.text;
    }
    
    // Update thinking/reasoning markers for subsections
    if (tokens.thinking && this.isTokenPair(tokens.thinking)) {
      markers.subsectionStart = markers.subsectionStart || tokens.thinking.start.text;
      markers.subsectionEnd = markers.subsectionEnd || tokens.thinking.end.text;
    }
  }
  
  private isTokenPair(token: SpecialToken | SpecialTokenPair): token is SpecialTokenPair {
    return 'start' in token && 'end' in token;
  }
  
  private formatText(element: TextElement): string {
    return element.content;
  }
  
  private formatMessage(element: MessageElement): string {
    const { markers } = this.options;
    const role = element.role.toUpperCase();
    
    // Convert content to string if it's an Attachment array
    const contentStr = typeof element.content === 'string' 
      ? element.content 
      : JSON.stringify(element.content);
    
    // Use special tokens or custom markers if available
    if (this.specialTokens && this.specialTokens[element.role]) {
      const token = this.specialTokens[element.role];
      if (this.isTokenPair(token)) {
        return `${token.start.text}${contentStr}${token.end.text}`;
      }
    }
    
    // Use role-specific markers if configured
    if (markers.messageRole && markers.messageContent) {
      const roleMarker = markers.messageRole.replace('{role}', role);
      const contentMarker = markers.messageContent.replace('{content}', contentStr);
      return roleMarker + contentMarker;
    }
    
    // Default formatting with XML-like tags for MLX models
    return `<!-- begin of ${role} -->\n${contentStr.trim()}\n<!-- end of ${role} -->`;
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
  
  private formatJSONElement(element: JSONElement): string {
    const { lineBreak } = this.options;
    const lines: string[] = [];

    const jsonContent = typeof element.content === 'string'
      ? element.content
      : JSON.stringify(element.content, null, 2);

    lines.push('### JSON Output Format');
    lines.push('');
    lines.push('```json');
    lines.push(jsonContent);
    lines.push('```');

    return lines.join(lineBreak);
  }

  private formatSubSection(element: SubSectionElement): string {
    const { markers, lineBreak } = this.options;
    const lines: string[] = [];

    // Add subsection start marker if provided
    if (markers.subsectionStart) lines.push(markers.subsectionStart);

    lines.push(`### ${element.title}`);
    lines.push('');

    // Format items as bullet list
    for (const item of element.items) {
      lines.push(`- ${item}`);
    }
    
    // Add subsection end marker if provided
    if (markers.subsectionEnd) lines.push(markers.subsectionEnd);
    
    return lines.join(lineBreak);
  }
}