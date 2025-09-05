import { describe, it, expect } from 'vitest';
import { compile, merge } from '@moduler-prompt/core';
import { withMaterials } from './modules/material';
import { streamProcessing } from './modules/stream-processing';
import { createStreamWorkflow } from './workflows/stream-workflow';
import type { MaterialContext } from './modules/material';
import type { StreamProcessingContext } from './modules/stream-processing';

describe('integration tests', () => {
  it('materialモジュールとstreamProcessingを統合できる', () => {
    type CombinedContext = MaterialContext & StreamProcessingContext;
    
    const combinedModule = merge(withMaterials, streamProcessing);
    
    const context: CombinedContext = {
      materials: [
        { id: 'doc1', title: 'Document 1', content: 'Content 1' }
      ],
      chunks: [
        { content: 'Chunk 1' }
      ],
      state: {
        content: 'Previous state'
      }
    };
    
    const result = compile(combinedModule, context);
    
    // 両方のモジュールのセクションが含まれることを確認
    const allSections = [
      ...result.instructions,
      ...result.data,
      ...result.output
    ];
    
    const sectionTitles = allSections
      .filter(e => e.type === 'section')
      .map(s => s.title);
    
    console.log('Available sections:', sectionTitles);
    
    expect(sectionTitles).toContain('Term Explanations'); // withMaterialsのterms
    expect(sectionTitles).toContain('Objective and Role'); // streamProcessingのobjective
  });
  
  it('ワークフローで実際のプロンプトを生成できる', () => {
    const summarizeAlgorithm = {
      processing: [
        'Summarize the key points from the input chunks',
        'Merge the summary with the current state'
      ]
    };
    
    const workflow = createStreamWorkflow({
      algorithm: summarizeAlgorithm,
      sizeControl: true,
      targetTokens: 500
    });
    
    const context = {
      chunks: [
        { content: 'This is a test chunk with some important information.' }
      ],
      state: {
        content: 'Previous summary of earlier chunks',
        usage: 100
      },
      iteration: 2,
      totalIterations: 5,
      targetTokens: 500
    };
    
    const result = compile(workflow, context);
    
    // プロンプトの構造を確認
    expect(result.instructions).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.output).toBeDefined();
    
    // 各セクションに内容があることを確認
    expect(result.instructions.length).toBeGreaterThan(0);
    
    // デバッグ出力
    console.log('\n=== Generated Prompt Structure ===');
    console.log('Instructions sections:', result.instructions.filter(e => e.type === 'section').map(s => s.title));
    console.log('Data sections:', result.data.filter(e => e.type === 'section').map(s => s.title));
    console.log('Output sections:', result.output.filter(e => e.type === 'section').map(s => s.title));
  });
});