import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConcatProcessWorkflow } from './concat-process-workflow.js';
import type { AIDriver } from './types.js';
import type { ConcatProcessContext } from './concat-process-workflow.js';
import type { PromptModule } from '@moduler-prompt/core';

describe('ConcatProcessWorkflow', () => {
  const mockDriver: AIDriver = {
    query: vi.fn()
  };

  // Simple test module that just echoes the chunk content
  const testModule: PromptModule<ConcatProcessContext> = {
    instructions: [
      'Process the following chunks'
    ],
    materials: [
      (context) => {
        if (!context.chunks) return null;
        return context.chunks.map(chunk => ({
          type: 'chunk' as const,
          content: chunk.content,
          partOf: chunk.partOf
        }));
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic processing', () => {
    it('processes single chunk', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1', partOf: 'test' }
      ];

      vi.mocked(mockDriver.query).mockResolvedValue('processed: chunk1');

      const result = await workflow.processChunks(mockDriver, chunks);

      expect(result.output).toBe('processed: chunk1');
      expect(result.context.processedCount).toBe(1);
      expect(mockDriver.query).toHaveBeenCalledTimes(1);
    });

    it('processes multiple chunks sequentially', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1' },
        { content: 'chunk2' },
        { content: 'chunk3' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2')
        .mockResolvedValueOnce('result3');

      const result = await workflow.processChunks(mockDriver, chunks);

      expect(result.output).toBe('result1\nresult2\nresult3');
      expect(result.context.processedCount).toBe(3);
      expect(result.context.results).toEqual(['result1', 'result2', 'result3']);
    });
  });

  describe('batch processing', () => {
    it('processes chunks in batches', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1' },
        { content: 'chunk2' },
        { content: 'chunk3' },
        { content: 'chunk4' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('batch1')
        .mockResolvedValueOnce('batch2');

      const result = await workflow.processChunks(mockDriver, chunks, {
        batchSize: 2
      });

      expect(mockDriver.query).toHaveBeenCalledTimes(2);
      expect(result.output).toBe('batch1\nbatch2');
      expect(result.metadata?.chunksProcessed).toBe(4);
    });
  });

  describe('concatenation', () => {
    it('concatenates results with default separator', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'a' },
        { content: 'b' },
        { content: 'c' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('A')
        .mockResolvedValueOnce('B')
        .mockResolvedValueOnce('C');

      const result = await workflow.processChunks(mockDriver, chunks);

      expect(result.output).toBe('A\nB\nC');
    });

    it('uses custom separator for concatenation', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'a' },
        { content: 'b' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('A')
        .mockResolvedValueOnce('B');

      const result = await workflow.processChunks(mockDriver, chunks, {
        separator: ' | '
      });

      expect(result.output).toBe('A | B');
    });
  });

  describe('parallel processing', () => {
    it('processes chunks in parallel when enabled', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1' },
        { content: 'chunk2' },
        { content: 'chunk3' }
      ];

      let callOrder: number[] = [];
      let callIndex = 0;
      
      vi.mocked(mockDriver.query).mockImplementation(() => {
        const index = callIndex++;
        return new Promise(resolve => {
          setTimeout(() => {
            callOrder.push(index);
            resolve(`result${index + 1}`);
          }, Math.random() * 10);
        });
      });

      const result = await workflow.processChunks(mockDriver, chunks, {
        parallel: true
      });

      expect(mockDriver.query).toHaveBeenCalledTimes(3);
      expect(result.context.processedCount).toBe(3);
      expect(result.metadata?.parallel).toBe(true);
      // Results should be in order despite parallel execution
      expect(result.context.results).toEqual(['result1', 'result2', 'result3']);
    });
  });

  describe('map operation', () => {
    it('maps over chunks', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'a' },
        { content: 'b' },
        { content: 'c' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('A')
        .mockResolvedValueOnce('B')
        .mockResolvedValueOnce('C');

      const results = await workflow.map(mockDriver, chunks);

      expect(results).toEqual(['A', 'B', 'C']);
    });
  });

  describe('error handling', () => {
    it('preserves partial results on error', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1' },
        { content: 'chunk2' },
        { content: 'chunk3' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2')
        .mockRejectedValueOnce(new Error('Processing failed'));

      try {
        await workflow.processChunks(mockDriver, chunks);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Processing failed');
        expect(error.partialResult).toBe('result1\nresult2');
        expect(error.context).toBeDefined();
        expect(error.context.chunks).toEqual(chunks);
        expect(error.phase).toBe('sequential-process');
        expect(error.iteration).toBe(2);
      }
    });

    it('throws error for empty chunks', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);

      await expect(
        workflow.processChunks(mockDriver, [])
      ).rejects.toThrow('No chunks provided for processing');
    });

    it('handles parallel processing errors', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'chunk1' },
        { content: 'chunk2' }
      ];

      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('result1')
        .mockRejectedValueOnce(new Error('Parallel error'));

      await expect(
        workflow.processChunks(mockDriver, chunks, { parallel: true })
      ).rejects.toThrow('Parallel error');
    });
  });

  describe('context preservation', () => {
    it('preserves chunk metadata', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = [
        { content: 'test', partOf: 'document', metadata: { index: 0 } }
      ];

      vi.mocked(mockDriver.query).mockResolvedValue('processed');

      const result = await workflow.processChunks(mockDriver, chunks);

      expect(result.context.chunks[0].metadata).toEqual({ index: 0 });
    });

    it('tracks processing progress', async () => {
      const workflow = new ConcatProcessWorkflow(testModule);
      const chunks = Array(5).fill(null).map((_, i) => ({
        content: `chunk${i}`
      }));

      vi.mocked(mockDriver.query).mockResolvedValue('processed');

      const result = await workflow.processChunks(mockDriver, chunks, {
        batchSize: 2
      });

      expect(result.context.processedCount).toBe(5);
      expect(result.metadata?.resultsCount).toBe(3); // 3 batches: 2+2+1
    });
  });
});