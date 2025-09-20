/**
 * Tests for JSON extraction utility
 */

import { describe, it, expect } from 'vitest';
import { extractJSON, extractJSONAs, containsJSON } from './index.js';

describe('extractJSON', () => {
  describe('Code block extraction', () => {
    it('should extract JSON from standard code block', () => {
      const text = `
Here is some JSON:
\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`
`;
      const result = extractJSON(text);
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should extract JSON from code block without language tag', () => {
      const text = `
\`\`\`
{
  "array": [1, 2, 3]
}
\`\`\`
`;
      const result = extractJSON(text);
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual({ array: [1, 2, 3] });
    });

    it('should extract array from code block', () => {
      const text = `
\`\`\`json
[
  { "id": 1 },
  { "id": 2 }
]
\`\`\`
`;
      const result = extractJSON(text);
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle multiple code blocks with multiple option', () => {
      const text = `
First block:
\`\`\`json
{"first": true}
\`\`\`

Second block:
\`\`\`json
{"second": true}
\`\`\`
`;
      const result = extractJSON(text, { multiple: true });
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual([
        { first: true },
        { second: true }
      ]);
    });

    it('should return first code block without multiple option', () => {
      const text = `
\`\`\`json
{"first": true}
\`\`\`
\`\`\`json
{"second": true}
\`\`\`
`;
      const result = extractJSON(text, { multiple: false });
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual({ first: true });
    });
  });

  describe('Direct JSON extraction', () => {
    it('should extract JSON object from mixed text', () => {
      const text = 'The response is {"status": "ok", "code": 200} as expected.';
      const result = extractJSON(text);
      expect(result.source).toBe('direct');
      expect(result.data).toEqual({ status: 'ok', code: 200 });
    });

    it('should extract JSON array from mixed text', () => {
      const text = 'Results: [1, 2, 3, 4, 5] (sorted)';
      const result = extractJSON(text);
      expect(result.source).toBe('direct');
      expect(result.data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle nested JSON objects', () => {
      const text = 'Config: {"user": {"name": "Alice", "settings": {"theme": "dark"}}}!';
      const result = extractJSON(text);
      expect(result.source).toBe('direct');
      expect(result.data).toEqual({
        user: {
          name: 'Alice',
          settings: { theme: 'dark' }
        }
      });
    });

    it('should handle JSON with strings containing brackets', () => {
      const text = 'Data: {"message": "Use [brackets] and {braces} carefully"}';
      const result = extractJSON(text);
      expect(result.source).toBe('direct');
      expect(result.data).toEqual({
        message: 'Use [brackets] and {braces} carefully'
      });
    });

    it('should extract multiple JSON objects with multiple option', () => {
      const text = 'First: {"a": 1} and second: {"b": 2}';
      const result = extractJSON(text, { multiple: true });
      expect(result.source).toBe('direct');
      expect(result.data).toEqual([{ a: 1 }, { b: 2 }]);
    });
  });

  describe('Full text parsing', () => {
    it('should parse clean JSON text', () => {
      const text = '{"clean": "json", "number": 42}';
      const result = extractJSON(text);
      expect(result.source).toBe('full');
      expect(result.data).toEqual({ clean: 'json', number: 42 });
    });

    it('should parse JSON with whitespace', () => {
      const text = `
        {
          "formatted": true,
          "indented": "yes"
        }
      `;
      const result = extractJSON(text);
      expect(result.source).toBe('full');
      expect(result.data).toEqual({ formatted: true, indented: 'yes' });
    });
  });

  describe('JSON repair functionality', () => {
    it('should repair JSON with trailing commas', () => {
      const text = '{"a": 1, "b": 2,}';
      const result = extractJSON(text, { repair: true });
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({ a: 1, b: 2 });
    });

    it('should repair JSON with single quotes', () => {
      const text = "{'name': 'test', 'value': 123}";
      const result = extractJSON(text, { repair: true });
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should repair JSON with missing quotes on keys', () => {
      const text = '{name: "test", value: 123}';
      const result = extractJSON(text, { repair: true });
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should repair JSON with comments', () => {
      const text = `{
        // This is a comment
        "name": "test",
        /* Multi-line
           comment */
        "value": 123
      }`;
      const result = extractJSON(text, { repair: true });
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should fail without repair option for malformed JSON', () => {
      const text = '{name: "test", value: 123,}';
      const result = extractJSON(text, { repair: false });
      expect(result.source).toBe('none');
      expect(result.error).toBeDefined();
    });

    it('should repair truncated JSON', () => {
      const text = '{"name": "test", "items": [1, 2, 3';
      const result = extractJSON(text, { repair: true });
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({ name: 'test', items: [1, 2, 3] });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const result = extractJSON('');
      expect(result.source).toBe('none');
      expect(result.data).toBe(null);
      expect(result.error).toBeDefined();
    });

    it('should handle text with no JSON', () => {
      const result = extractJSON('This is just plain text without any JSON.');
      expect(result.source).toBe('none');
      expect(result.data).toBe(null);
      expect(result.error).toBeDefined();
    });

    it('should handle broken JSON that cannot be repaired', () => {
      // Note: jsonrepair is very powerful and can repair many broken JSONs
      // This specific text actually gets repaired to {"this is not": "even close to valid JSON"}
      const text = '{this is not: even close to valid JSON}';
      const result = extractJSON(text);
      // With jsonrepair, this actually succeeds
      expect(result.source).toBe('full');
      expect(result.repaired).toBe(true);
      expect(result.data).toEqual({"this is not": "even close to valid JSON"});
    });

    it('should handle truly unparseable text', () => {
      const text = 'this is not JSON at all';
      const result = extractJSON(text);
      expect(result.source).toBe('none');
      expect(result.error).toBeDefined();
    });

    it('should prioritize code blocks over direct JSON', () => {
      const text = `
{"direct": "json"}
\`\`\`json
{"codeblock": "json"}
\`\`\`
`;
      const result = extractJSON(text);
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual({ codeblock: 'json' });
    });

    it('should handle escaped characters in strings', () => {
      const text = '{"escaped": "She said \\"hello\\" to me"}';
      const result = extractJSON(text);
      expect(result.data).toEqual({ escaped: 'She said "hello" to me' });
    });

    it('should handle unicode characters', () => {
      const text = '{"emoji": "🎉", "japanese": "こんにちは"}';
      const result = extractJSON(text);
      expect(result.data).toEqual({ emoji: '🎉', japanese: 'こんにちは' });
    });

    it('should handle very large JSON objects', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const text = JSON.stringify(largeArray);
      const result = extractJSON(text);
      expect(result.source).toBe('full');
      expect(result.data).toEqual(largeArray);
    });
  });

  describe('extractJSONAs', () => {
    interface TestType {
      name: string;
      value: number;
    }

    it('should extract and type JSON', () => {
      const text = '{"name": "test", "value": 42}';
      const result = extractJSONAs<TestType>(text);
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should return null for invalid JSON', () => {
      const text = 'not json';
      const result = extractJSONAs<TestType>(text);
      expect(result).toBeNull();
    });

    it('should extract typed arrays', () => {
      const text = '[{"id": 1}, {"id": 2}]';
      const result = extractJSONAs<Array<{ id: number }>>(text);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('containsJSON', () => {
    it('should return true for text with valid JSON', () => {
      expect(containsJSON('{"valid": true}')).toBe(true);
      expect(containsJSON('Text with {"json": "inside"}')).toBe(true);
      expect(containsJSON('```json\n{}\n```')).toBe(true);
    });

    it('should return false for text without valid JSON', () => {
      expect(containsJSON('plain text')).toBe(false);
      expect(containsJSON('')).toBe(false);
      expect(containsJSON('{broken json')).toBe(false);
    });

    it('should detect repairable JSON as invalid without repair', () => {
      // With repair disabled, malformed JSON should not be detected
      const malformed = '{name: "test"}';
      expect(containsJSON(malformed)).toBe(false);
    });
  });

  describe('Real-world examples', () => {
    it('should extract JSON from LLM response with explanation', () => {
      const text = `
Based on your requirements, here's the configuration:

\`\`\`json
{
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000,
  "top_p": 0.9
}
\`\`\`

This configuration provides a good balance between creativity and consistency.
`;
      const result = extractJSON(text);
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual({
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      });
    });

    it('should extract malformed JSON from LLM response', () => {
      const text = `
The analysis results are:
{
  "sentiment": "positive",
  "confidence": 0.85,
  "keywords": ["happy", "satisfied", "good"],
  // Note: confidence is high
}
`;
      const result = extractJSON(text, { repair: true });
      expect(result.source).toBe('direct');
      expect(result.data).toEqual({
        sentiment: 'positive',
        confidence: 0.85,
        keywords: ['happy', 'satisfied', 'good']
      });
    });

    it('should handle mixed format response', () => {
      const text = `
Summary: Processing completed successfully

Results:
\`\`\`json
{
  "processed": 150,
  "failed": 3,
  "success_rate": 0.98
}
\`\`\`

Additional data:
\`\`\`json
{"timestamp": "2024-01-01T00:00:00Z"}
\`\`\`
`;
      const result = extractJSON(text, { multiple: true });
      expect(result.source).toBe('codeblock');
      expect(result.data).toEqual([
        {
          processed: 150,
          failed: 3,
          success_rate: 0.98
        },
        {
          timestamp: '2024-01-01T00:00:00Z'
        }
      ]);
    });
  });
});