import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { DefaultModelSpecificProcessor } from '../../src/mlx-ml/process/model-specific.js';

describe('MLX Special Tokens Formatting', () => {
  describe('Material element with special tokens', () => {
    it('should format JSON material with code block tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

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

      const result = await processor.formatCompletionPrompt(prompt);

      // materialsセクションの内容を確認
      expect(result).toContain('Configuration');
      // MaterialElementはmarkdown引用形式でフォーマットされる
      expect(result).toMatch(/###\s+Configuration|>\s+\{/);
    });

    it('should format code material with code block tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

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

      const result = await processor.formatCompletionPrompt(prompt);

      expect(result).toContain('Example Function');
      expect(result).toContain('function hello()');
      // MaterialElementはmarkdown引用形式でフォーマットされる
      expect(result).toMatch(/###\s+Example Function|>\s+function/);
    });
  });

  describe('Schema output with special tokens', () => {
    it('should format schema output with JSON tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

      const prompt = compile({
        instructions: ['Generate response'],
        cue: ['Generate JSON in the specified format'],
        schema: [
          () => ({
            type: 'json' as const,
            content: {
              type: 'object',
              properties: {
                result: { type: 'string' }
              }
            }
          })
        ]
      });

      const result = await processor.formatCompletionPrompt(prompt);

      // JSON出力形式が特殊トークンでマークされることを確認
      // schemaセクションのJSONElementが```jsonブロックとしてフォーマットされる
      expect(result).toContain('```json');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('```');
    });
  });

  describe('Section with heading tokens', () => {
    it('should format section titles appropriately', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

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

      const result = await processor.formatCompletionPrompt(prompt);

      // セクションタイトルが適切にフォーマットされることを確認
      expect(result).toContain('Important Rules');
      expect(result).toContain('Rule 1');
      expect(result).toContain('Rule 2');
    });
  });
});