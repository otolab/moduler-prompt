import { describe, it, expect } from 'vitest';
import { compile } from '@modular-prompt/core';
import { formatCompletionPrompt } from '../../src/formatter/converter.js';

describe('MLX Special Tokens Formatting', () => {
  describe('Material element with special tokens', () => {
    it('should format JSON material with code block tokens', async () => {
      // materialsセクションはSectionElementとしてコンパイルされる
      // DynamicContentとしてMaterialElementを返す
      const prompt = compile({
        instructions: ['Process the data'],
        materials: [
          () => ({
            type: 'material' as const,
            id: 'config',
            title: 'Configuration',
            content: '{"api_key": "secret", "timeout": 30}'
          })
        ],
        output: []
      });

      const result = await formatCompletionPrompt(prompt);

      // materialsセクションの内容を確認
      expect(result).toContain('Configuration');
      // MaterialElementはmarkdown引用形式でフォーマットされる
      expect(result).toMatch(/###\s+Configuration|>\s+\{/);
    });

    it('should format code material with code block tokens', async () => {
      const prompt = compile({
        instructions: ['Review the code'],
        materials: [
          () => ({
            type: 'material' as const,
            id: 'code',
            title: 'Example Function',
            content: 'function hello() {\n  console.log("Hello");\n}'
          })
        ],
        output: []
      });

      const result = await formatCompletionPrompt(prompt);

      expect(result).toContain('Example Function');
      expect(result).toContain('function hello()');
      // MaterialElementはmarkdown引用形式でフォーマットされる
      expect(result).toMatch(/###\s+Example Function|>\s+function/);
    });
  });

  describe('Schema output with special tokens', () => {
    it('should format schema output with JSON tokens', async () => {
      const prompt = compile({
        instructions: ['Generate response'],
        cue: ['Generate JSON in the specified format'],
        schema: [
          {
            type: 'json' as const,
            content: {
              type: 'object',
              properties: {
                result: { type: 'string' }
              }
            }
          }
        ]
      });

      const result = await formatCompletionPrompt(prompt);

      // JSON出力形式が含まれることを確認
      // schemaセクションのJSONElementが### Output Schemaとしてフォーマットされる（Instructionsセクション内）
      expect(result).toContain('### Output Schema');
      expect(result).toContain('```json');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
    });

    it('should not extract dynamic schema to metadata (but still renders as normal section)', async () => {
      const prompt = compile({
        instructions: ['Generate response'],
        schema: [
          // DynamicContentとしてJSONElementを返す場合、metadata.outputSchemaには抽出されない
          () => ({
            type: 'json' as const,
            content: {
              type: 'object',
              properties: {
                dynamicField: { type: 'string' }
              }
            }
          })
        ]
      });

      // metadata.outputSchemaは設定されない（静的なJSONElementのみ抽出される）
      expect(prompt.metadata?.outputSchema).toBeUndefined();

      const result = await formatCompletionPrompt(prompt);

      // 通常のセクションとして "## Output Schema" が表示される
      expect(result).toContain('## Output Schema');
      // JSONElementの内容も含まれる
      expect(result).toContain('dynamicField');
      // ただし、metadata.outputSchemaとしての特別なフォーマット（### Output Schema）は含まれない
      expect(result).not.toContain('### Output Schema');
    });
  });

  describe('Section with heading tokens', () => {
    it('should format section titles appropriately', async () => {
      const prompt = compile({
        instructions: [
          'Process the following:',
          {
            type: 'subsection',
            title: 'Important Rules',
            items: ['Rule 1', 'Rule 2']
          }
        ]
      });

      const result = await formatCompletionPrompt(prompt);

      // セクションタイトルが適切にフォーマットされることを確認
      expect(result).toContain('Important Rules');
      expect(result).toContain('Rule 1');
      expect(result).toContain('Rule 2');
    });
  });
});