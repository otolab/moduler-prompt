import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';
import { 
  createStreamWorkflow, 
  executeStreamIteration,
  StreamProcessor 
} from './stream-workflow';
import type { StreamWorkflowContext } from './stream-workflow';

describe('stream-workflow', () => {
  // テスト用のアルゴリズムモジュール
  const testAlgorithm: PromptModule = {
    processing: [
      'Summarize the content',
      'Extract key points'
    ]
  };

  describe('createStreamWorkflow', () => {
    it('基本的なワークフローを作成できる', () => {
      const workflow = createStreamWorkflow({
        algorithm: testAlgorithm
      });
      
      expect(workflow).toBeDefined();
      expect(workflow.objective).toBeDefined();
      expect(workflow.createContext).toBeDefined();
    });

    it('サイズ制御を有効にできる', () => {
      const workflow = createStreamWorkflow({
        algorithm: testAlgorithm,
        sizeControl: true,
        targetTokens: 1500
      });
      
      const context = workflow.createContext!();
      expect(context.targetTokens).toBe(1500);
    });

    it('イテレーション情報を含むobjectiveを生成', () => {
      const workflow = createStreamWorkflow({
        algorithm: testAlgorithm
      });
      
      const context: StreamWorkflowContext = {
        iteration: 3,
        totalIterations: 10
      };
      
      const result = compile(workflow, context);
      const objectiveSection = result.instructions.find(e => e.type === 'section' && e.title === 'Objective');
      
      if (objectiveSection?.type === 'section') {
        const iterationInfo = objectiveSection.items
          .filter(item => typeof item === 'string')
          .find(str => str.includes('iteration 3 of 10'));
        expect(iterationInfo).toBeDefined();
      }
    });
  });

  describe('executeStreamIteration', () => {
    it('単一のイテレーションを実行できる', async () => {
      const workflow = createStreamWorkflow({
        algorithm: testAlgorithm
      });
      
      const context: StreamWorkflowContext = {
        chunks: [
          { content: 'Test chunk 1' },
          { content: 'Test chunk 2' }
        ],
        state: {
          content: 'Previous state'
        },
        iteration: 1
      };
      
      const result = await executeStreamIteration(workflow, context);
      
      expect(result).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.output).toBeDefined();
      
      // セクションが生成されていることを確認
      const allSections = [
        ...result.instructions,
        ...result.data,
        ...result.output
      ].filter(e => e.type === 'section');
      expect(allSections.length).toBeGreaterThan(0);
    });
  });

  describe('StreamProcessor', () => {
    const testWorkflow = createStreamWorkflow({
      algorithm: testAlgorithm
    });

    it('インスタンスを作成できる', () => {
      const processor = new StreamProcessor(testWorkflow);
      expect(processor).toBeDefined();
      expect(processor.getState()).toBe('');
    });

    it('バッチ処理を実行できる', async () => {
      const processor = new StreamProcessor(testWorkflow);
      
      const chunks = [
        { content: 'Batch chunk 1' },
        { content: 'Batch chunk 2' }
      ];
      
      const result = await processor.processBatch(chunks);
      
      expect(result).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it('状態を更新・取得できる', () => {
      const processor = new StreamProcessor(testWorkflow);
      
      processor.updateState('New state content');
      expect(processor.getState()).toBe('New state content');
    });

    it('リセットできる', async () => {
      const processor = new StreamProcessor(testWorkflow);
      
      // 状態を変更
      processor.updateState('Some state');
      await processor.processBatch([{ content: 'chunk' }]);
      
      // リセット
      processor.reset();
      
      expect(processor.getState()).toBe('');
    });

    it('複数のイテレーションを追跡できる', async () => {
      const processor = new StreamProcessor(testWorkflow);
      
      // 最初のバッチ
      const result1 = await processor.processBatch([
        { content: 'First batch' }
      ], { totalIterations: 3 });
      
      // イテレーション番号が含まれているか確認
      const objectiveSection1 = result1.instructions.find(e => e.type === 'section' && e.title === 'Objective');
      if (objectiveSection1?.type === 'section') {
        const hasIteration1 = objectiveSection1.items.some(
          item => typeof item === 'string' && item.includes('iteration 1')
        );
        expect(hasIteration1).toBe(true);
      }
      
      // 2番目のバッチ
      const result2 = await processor.processBatch([
        { content: 'Second batch' }
      ], { totalIterations: 3 });
      
      const objectiveSection2 = result2.instructions.find(e => e.type === 'section' && e.title === 'Objective');
      if (objectiveSection2?.type === 'section') {
        const hasIteration2 = objectiveSection2.items.some(
          item => typeof item === 'string' && item.includes('iteration 2')
        );
        expect(hasIteration2).toBe(true);
      }
    });

    it('カスタムコンテキストを渡せる', async () => {
      interface CustomContext extends StreamWorkflowContext {
        customField: string;
      }
      
      const customWorkflow: PromptModule<CustomContext> = {
        ...testWorkflow,
        processing: [
          (context) => ({
            type: 'text',
            content: `Custom: ${context.customField}`
          })
        ]
      };
      
      const processor = new StreamProcessor<CustomContext>(customWorkflow);
      
      const result = await processor.processBatch(
        [{ content: 'chunk' }],
        { customField: 'test value' }
      );
      
      const processingSection = result.instructions.find(e => e.type === 'section' && e.title === 'Processing');
      if (processingSection?.type === 'section') {
        const customText = processingSection.items.find(
          item => typeof item === 'string' && item.includes('Custom: test value')
        );
        expect(customText).toBeDefined();
      }
    });
  });
});