import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { DefaultModelSpecificProcessor } from '../../src/mlx-ml/process/model-specific.js';

describe('MLX Special Tokens Formatting', () => {
  describe('Material element with special tokens', () => {
    it('should format JSON material with code block tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

      const prompt = compile({
        instructions: ['Process the data'],
        data: [],
        output: []
      });

      // materialエレメントを追加
      prompt.data = [{
        type: 'material',
        id: 'config',
        title: 'Configuration',
        content: '{"api_key": "secret", "timeout": 30}'
      }];

      const result = await processor.formatCompletionPrompt(prompt);

      // Gemma-3では```トークンが利用可能
      expect(result).toContain('```');
      expect(result).toContain('Configuration');
    });

    it('should format code material with code block tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

      const prompt = compile({
        instructions: ['Review the code'],
        data: [],
        output: []
      });

      prompt.data = [{
        type: 'material',
        id: 'code',
        title: 'Example Function',
        content: 'function hello() {\n  console.log("Hello");\n}'
      }];

      const result = await processor.formatCompletionPrompt(prompt);

      expect(result).toContain('```');
      expect(result).toContain('Example Function');
      expect(result).toContain('function hello()');
    });
  });

  describe('Schema output with special tokens', () => {
    it('should format schema output with JSON tokens', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

      const prompt = compile({
        instructions: ['Generate response'],
        data: [],
        output: [{
          type: 'text',
          content: 'Generate JSON in the specified format'
        }]
      });

      prompt.metadata = {
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      };

      const result = await processor.formatCompletionPrompt(prompt);

      // JSON出力形式が特殊トークンでマークされることを確認
      expect(result).toContain('Output Format');
      expect(result).toContain('```json');
    });
  });

  describe('Section with heading tokens', () => {
    it('should format section titles appropriately', async () => {
      const processor = new DefaultModelSpecificProcessor('gemma-3');

      const prompt = compile({
        instructions: [{
          type: 'section',
          title: 'Important Rules',
          items: ['Rule 1', 'Rule 2']
        }],
        data: [],
        output: []
      });

      const result = await processor.formatCompletionPrompt(prompt);

      // セクションタイトルが適切にフォーマットされることを確認
      expect(result).toContain('Important Rules');
      expect(result).toContain('Rule 1');
      expect(result).toContain('Rule 2');
    });
  });
});