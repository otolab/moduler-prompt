import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { formatCompletionPrompt } from '../../src/formatter/converter.js';

describe('MLX Processor Integration', () => {
  it('should process compiled prompt with materials', async () => {
    // 通常のcompileの使い方
    const prompt = compile({
      instructions: ['Process the data'],
      materials: [
        'Material item 1',
        'Material item 2'
      ]
    });

    const result = await formatCompletionPrompt(prompt);

    // デバッグ用に出力
    console.log('Compiled prompt structure:', JSON.stringify(prompt, null, 2));
    console.log('Formatted result:', result);

    // materialsセクションが含まれることを確認
    expect(result).toContain('Prepared Materials');
    expect(result).toContain('Material item 1');
    expect(result).toContain('Material item 2');
  });

  it('should process dynamic materials', async () => {
    // DynamicContentとしてMaterialElementを返す
    const prompt = compile({
      instructions: ['Process the data'],
      materials: [
        () => ({
          type: 'material' as const,
          id: 'test',
          title: 'Test Material',
          content: 'Test content'
        })
      ]
    });

    const result = await formatCompletionPrompt(prompt);

    console.log('Dynamic material result:', result);

    // DynamicElementは文字列に変換されている
    expect(result).toContain('Test Material');
    expect(result).toContain('Test content');
  });

  it('should process JSON schema', async () => {
    const prompt = compile({
      instructions: ['Generate response'],
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

    const result = await formatCompletionPrompt(prompt);

    console.log('Schema result:', result);

    // JSONElementが直接処理される（schemaはInstructionsセクションに配置される）
    expect(result).toContain('### Output Schema');
    expect(result).toContain('```json');
    expect(result).toContain('"type": "object"');
    expect(result).toContain('"properties"');
  });
});