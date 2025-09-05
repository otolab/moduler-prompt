import { describe, it, expect, vi } from 'vitest';
import { SummarizeWorkflow } from './summarize-workflow.js';
import type { AIDriver } from './types.js';
import type { SummarizeWorkflowContext } from './summarize-workflow.js';

describe('SummarizeWorkflow', () => {
  const mockDriver: AIDriver = {
    query: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text chunking', () => {
    it('splits text into chunks and summarizes', async () => {
      const workflow = new SummarizeWorkflow();
      const longText = Array(1000).fill('word').join(' ');
      
      vi.mocked(mockDriver.query).mockResolvedValue('Summarized content');
      
      const result = await workflow.summarize(mockDriver, longText, {
        targetTokens: 100,
        chunkSize: 500,
        enableAnalysis: false
      });
      
      expect(result.output).toBe('Summarized content');
      expect(result.context.phase).toBe('complete');
      expect(result.metadata?.targetTokens).toBe(100);
    });
  });

  describe('with analysis phase', () => {
    it('performs analysis before summarization', async () => {
      const workflow = new SummarizeWorkflow();
      const context: SummarizeWorkflowContext = {
        chunks: [
          { content: 'chunk1', partOf: 'source' },
          { content: 'chunk2', partOf: 'source' },
          { content: 'chunk3', partOf: 'source' }
        ]
      };
      
      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('Analysis report')
        .mockResolvedValueOnce('Final summary');
      
      const result = await workflow.execute(mockDriver, context, {
        targetTokens: 50,
        enableAnalysis: true
      });
      
      expect(result.output).toBe('Final summary');
      expect(result.context.analysisReport).toBe('Analysis report');
      expect(result.context.preparationNote?.content).toBe('Analysis report');
      expect(mockDriver.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('iterative processing', () => {
    it('processes chunks in batches', async () => {
      const workflow = new SummarizeWorkflow();
      const chunks = Array(9).fill(null).map((_, i) => ({
        content: `chunk${i}`,
        partOf: 'source'
      }));
      
      const context: SummarizeWorkflowContext = { chunks };
      
      let callCount = 0;
      vi.mocked(mockDriver.query).mockImplementation(() => {
        callCount++;
        return Promise.resolve(`Summary iteration ${callCount}`);
      });
      
      const result = await workflow.execute(mockDriver, context, {
        targetTokens: 100,
        enableAnalysis: false
      });
      
      // Should process in batches of 3
      expect(mockDriver.query).toHaveBeenCalledTimes(3);
      expect(result.output).toBe('Summary iteration 3');
      expect(result.metadata?.iterations).toBe(3);
    });
  });

  describe('error handling', () => {
    it('includes context in error for recovery', async () => {
      const workflow = new SummarizeWorkflow();
      const context: SummarizeWorkflowContext = {
        state: { content: 'test', usage: 4 }
      };
      
      vi.mocked(mockDriver.query).mockRejectedValue(new Error('Processing failed'));
      
      try {
        await workflow.execute(mockDriver, context, {
          targetTokens: 100
        });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Processing failed');
        expect(error.context).toEqual(context);
      }
    });
  });

  describe('phase tracking', () => {
    it('tracks phases correctly', async () => {
      const workflow = new SummarizeWorkflow();
      const context: SummarizeWorkflowContext = {
        chunks: [{ content: 'test', partOf: 'source' }]
      };
      
      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('analysis result')
        .mockResolvedValueOnce('summary result');
      
      const result = await workflow.execute(mockDriver, context, {
        targetTokens: 50,
        enableAnalysis: true
      });
      
      expect(result.context.phase).toBe('complete');
      expect(mockDriver.query).toHaveBeenCalledTimes(2);
    });
  });
});