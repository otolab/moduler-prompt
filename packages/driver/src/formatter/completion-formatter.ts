import type { CompiledPrompt } from '@moduler-prompt/core';
import type { FormatterOptions } from './types.js';
import { DefaultFormatter } from './formatter.js';
import { defaultFormatterTexts } from './converter.js';

/**
 * Default special tokens for Echo driver (HTML-like tags for visual distinction)
 */
export const ECHO_SPECIAL_TOKENS = {
  markers: {
    sectionStart: '<section>',
    sectionEnd: '</section>',
    subsectionStart: '<subsection>',
    subsectionEnd: '</subsection>',
    materialStart: '<material>',
    materialEnd: '</material>',
    chunkStart: '<chunk>',
    chunkEnd: '</chunk>'
  }
};

/**
 * Format a compiled prompt for completion API with section headers
 * This is the unified implementation used by both Echo driver (debug/test) and MLX driver (production)
 *
 * @param prompt - Compiled prompt to format
 * @param options - Formatter options including optional specialTokens or markers
 * @returns Formatted prompt string with section headers (# Instructions, # Data, # Output)
 */
export function formatCompletionPrompt(
  prompt: CompiledPrompt,
  options: FormatterOptions = {}
): string {
  const formatter = options.formatter || new DefaultFormatter(options);
  const {
    lineBreak = '\n',
    preamble,
    sectionDescriptions = defaultFormatterTexts.sectionDescriptions
  } = options;
  const sections: string[] = [];

  // Add preamble if provided
  if (preamble) {
    sections.push(preamble);
    sections.push('');
  }

  // Format instructions section with header
  if (prompt.instructions && prompt.instructions.length > 0) {
    sections.push('# Instructions');
    if (sectionDescriptions?.instructions) {
      sections.push('');
      sections.push(sectionDescriptions.instructions);
    }
    sections.push('');
    sections.push(formatter.formatAll(prompt.instructions));

    // Add output schema to Instructions section if metadata.outputSchema exists
    if (prompt.metadata?.outputSchema) {
      sections.push('');
      const schemaContent = JSON.stringify(prompt.metadata.outputSchema, null, 2);
      sections.push('Output ONLY a valid JSON object that conforms to the following schema. Do not include any explanation, commentary, or text before or after the JSON.');
      sections.push('');
      sections.push('### Output Schema');
      sections.push('');
      sections.push('```json');
      sections.push(schemaContent);
      sections.push('```');
    }
  }

  // Format data section with header
  if (prompt.data && prompt.data.length > 0) {
    if (sections.length > 0) sections.push('');
    sections.push('# Data');
    if (sectionDescriptions?.data) {
      sections.push('');
      sections.push(sectionDescriptions.data);
    }
    sections.push('');
    sections.push(formatter.formatAll(prompt.data));
  }

  // Format output section with header - always show the section
  if (sections.length > 0) sections.push('');
  sections.push('# Output');
  if (sectionDescriptions?.output) {
    sections.push('');
    sections.push(sectionDescriptions.output);
  }
  if (prompt.output && prompt.output.length > 0) {
    sections.push('');
    sections.push(formatter.formatAll(prompt.output));
  }

  return sections.join(lineBreak);
}
