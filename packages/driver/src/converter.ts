import type { Element, TextElement, MessageElement, MaterialElement, ChunkElement, SectionElement, SubSectionElement } from '@moduler-prompt/core';

/**
 * Convert elements to prompt text
 */
export function elementsToPromptText(elements: Element[]): string {
  const sections: string[] = [];
  
  for (const element of elements) {
    const text = elementToText(element);
    if (text) {
      sections.push(text);
    }
  }
  
  return sections.join('\n\n');
}

/**
 * Convert a single element to text
 */
function elementToText(element: Element): string {
  switch (element.type) {
    case 'text':
      return (element as TextElement).content;
      
    case 'message':
      return formatMessage(element as MessageElement);
      
    case 'material':
      return formatMaterial(element as MaterialElement);
      
    case 'chunk':
      return formatChunk(element as ChunkElement);
      
    case 'section':
      return formatSection(element as SectionElement);
      
    case 'subsection':
      return formatSubSection(element as SubSectionElement);
      
    default:
      return '';
  }
}

/**
 * Format a message element
 */
function formatMessage(message: MessageElement): string {
  const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `${roleLabel}: ${message.content}`;
}

/**
 * Format a material element
 */
function formatMaterial(material: MaterialElement): string {
  const lines: string[] = [];
  
  lines.push(`[Material: ${material.title}]`);
  
  if (material.id) {
    lines.push(`ID: ${material.id}`);
  }
  
  // Handle content which can be string or Attachment[]
  if (typeof material.content === 'string') {
    lines.push(material.content);
  } else {
    lines.push('Attachments:');
    for (const attachment of material.content) {
      lines.push(`- ${JSON.stringify(attachment)}`);
    }
  }
  
  if (material.usage !== undefined) {
    lines.push(`(Usage: ${material.usage} tokens)`);
  }
  
  return lines.join('\n');
}

/**
 * Format a chunk element
 */
function formatChunk(chunk: ChunkElement): string {
  const lines: string[] = [];
  
  lines.push(`[Chunk of ${chunk.partOf}]`);
  
  if (chunk.index !== undefined) {
    lines.push(`Index: ${chunk.index}`);
  }
  
  // Handle content which can be string or Attachment[]
  if (typeof chunk.content === 'string') {
    lines.push(chunk.content);
  } else {
    lines.push('Attachments:');
    for (const attachment of chunk.content) {
      lines.push(`- ${JSON.stringify(attachment)}`);
    }
  }
  
  if (chunk.usage !== undefined) {
    lines.push(`(Usage: ${chunk.usage} tokens)`);
  }
  
  return lines.join('\n');
}

/**
 * Format a section element
 */
function formatSection(section: SectionElement): string {
  const lines: string[] = [];
  
  // Add section header
  lines.push(`## ${section.title}`);
  lines.push('');
  
  // Add section items
  for (const item of section.items) {
    if (typeof item === 'string') {
      lines.push(item);
    } else if (typeof item === 'object' && 'type' in item && item.type === 'subsection') {
      lines.push(formatSubSection(item as SubSectionElement));
    }
    // Skip DynamicContent functions
  }
  
  return lines.join('\n');
}

/**
 * Format a subsection element
 */
function formatSubSection(subsection: SubSectionElement): string {
  const lines: string[] = [];
  
  // Add subsection header
  lines.push(`### ${subsection.title}`);
  lines.push('');
  
  // Add subsection items
  for (const item of subsection.items) {
    lines.push(item);
  }
  
  return lines.join('\n');
}

/**
 * Convert prompt text to chat messages
 */
export function promptTextToMessages(prompt: string, role: 'system' | 'user' = 'system'): Array<{ role: string; content: string }> {
  return [{
    role,
    content: prompt
  }];
}