/**
 * JSON extraction utility
 * Extract and repair JSON from various text formats
 */

import { jsonrepair } from 'jsonrepair';

/**
 * Options for JSON extraction
 */
export interface ExtractJSONOptions {
  /**
   * Whether to attempt repair of malformed JSON
   * @default true
   */
  repair?: boolean;

  /**
   * Whether to allow multiple JSON objects/arrays
   * @default false
   */
  multiple?: boolean;

  /**
   * Whether to validate against a schema (future enhancement)
   * @default undefined
   */
  schema?: object;
}

/**
 * Result of JSON extraction
 */
export interface ExtractJSONResult {
  /**
   * Successfully extracted JSON data
   */
  data: unknown | unknown[];

  /**
   * Whether repair was applied
   */
  repaired: boolean;

  /**
   * Source format where JSON was found
   */
  source: 'codeblock' | 'direct' | 'full' | 'none';

  /**
   * Error message if extraction failed
   */
  error?: string;
}

/**
 * Extract JSON from markdown code blocks
 */
function extractFromCodeBlocks(text: string, options: ExtractJSONOptions): unknown[] {
  const results: unknown[] = [];

  // Match various code block formats
  const patterns = [
    /```json\s*\n([\s\S]*?)\n```/g,
    /```JSON\s*\n([\s\S]*?)\n```/g,
    /```\s*\n(\{[\s\S]*?\})\n```/g,
    /```\s*\n(\[[\s\S]*?\])\n```/g,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      try {
        const jsonText = match[1].trim();
        const parsed = options.repair
          ? JSON.parse(jsonrepair(jsonText))
          : JSON.parse(jsonText);

        results.push(parsed);

        if (!options.multiple && results.length > 0) {
          return results;
        }
      } catch {
        // Continue to next match
      }
    }
  }

  return results;
}

/**
 * Extract balanced JSON object or array from text
 */
function extractBalancedJSON(text: string, startIndex: number): string | null {
  const startChar = text[startIndex];
  const endChar = startChar === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    // Handle escape sequences
    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    // Handle string boundaries
    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    // Track depth when not in string
    if (!inString) {
      if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
        if (depth === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Extract JSON objects/arrays directly from text
 */
function extractDirectJSON(text: string, options: ExtractJSONOptions): unknown[] {
  const results: unknown[] = [];

  // Find all potential JSON start positions
  const regex = /[{[]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const extracted = extractBalancedJSON(text, match.index);

    if (extracted) {
      try {
        const parsed = options.repair
          ? JSON.parse(jsonrepair(extracted))
          : JSON.parse(extracted);

        results.push(parsed);

        if (!options.multiple) {
          return results;
        }

        // Skip ahead to avoid re-parsing the same JSON
        regex.lastIndex = match.index + extracted.length;
      } catch {
        // Continue to next potential match
      }
    }
  }

  return results;
}

/**
 * Try to parse the entire text as JSON
 */
function parseFullText(text: string, options: ExtractJSONOptions): unknown | null {
  const trimmed = text.trim();

  // Check if it looks like JSON before attempting to parse
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
    return null;
  }

  try {
    return options.repair
      ? JSON.parse(jsonrepair(trimmed))
      : JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Extract JSON from text
 *
 * Attempts multiple strategies:
 * 1. Extract from markdown code blocks
 * 2. Extract direct JSON objects/arrays
 * 3. Parse entire text as JSON
 *
 * @param text Source text containing JSON
 * @param options Extraction options
 * @returns Extraction result with data and metadata
 */
export function extractJSON(
  text: string,
  options: ExtractJSONOptions = {}
): ExtractJSONResult {
  const opts: ExtractJSONOptions = {
    repair: true,
    multiple: false,
    ...options
  };

  // Try code blocks first (most reliable)
  const codeBlockResults = extractFromCodeBlocks(text, opts);
  if (codeBlockResults.length > 0) {
    return {
      data: opts.multiple ? codeBlockResults : codeBlockResults[0],
      repaired: opts.repair ?? true,
      source: 'codeblock'
    };
  }

  // Try parsing the full text before direct extraction
  // This avoids misclassifying pure JSON as 'direct'
  const fullResult = parseFullText(text, opts);
  if (fullResult !== null) {
    // Check if this is actually a clean JSON (no surrounding text)
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        // If it parses without repair, it's full JSON
        JSON.parse(trimmed);
        return {
          data: fullResult,
          repaired: false,
          source: 'full'
        };
      } catch {
        // If it needed repair, check if it's still full JSON
        if (opts.repair && (trimmed === text || /^\s*[{[]/.test(text))) {
          return {
            data: fullResult,
            repaired: true,
            source: 'full'
          };
        }
      }
    }
  }

  // Try direct JSON extraction (JSON embedded in text)
  const directResults = extractDirectJSON(text, opts);
  if (directResults.length > 0) {
    return {
      data: opts.multiple ? directResults : directResults[0],
      repaired: opts.repair ?? true,
      source: 'direct'
    };
  }

  // Return the full parse result if we had one but classified it as direct
  if (fullResult !== null) {
    return {
      data: fullResult,
      repaired: opts.repair ?? true,
      source: 'full'
    };
  }

  // No JSON found
  return {
    data: opts.multiple ? [] : null,
    repaired: false,
    source: 'none',
    error: 'No valid JSON found in text'
  };
}

/**
 * Extract JSON with type assertion
 *
 * @param text Source text
 * @param options Extraction options
 * @returns Typed JSON data or null
 */
export function extractJSONAs<T>(
  text: string,
  options?: ExtractJSONOptions
): T | null {
  const result = extractJSON(text, options);

  if (result.source === 'none' || result.data === null ||
      (Array.isArray(result.data) && result.data.length === 0)) {
    return null;
  }

  return result.data as T;
}

/**
 * Check if text contains valid JSON
 */
export function containsJSON(text: string): boolean {
  const result = extractJSON(text, { repair: false });
  return result.source !== 'none';
}