import { describe, it, expect, vi } from 'vitest';
import { AnalysisWorkflow } from './analysis-workflow.js';
import type { AIDriver } from './types.js';
import type { AnalysisContext } from './analysis-workflow.js';

describe('AnalysisWorkflow', () => {
  const mockDriver: AIDriver = {
    query: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analysis types', () => {
    it('performs structure analysis', async () => {
      const workflow = new AnalysisWorkflow();
      const content = 'class Foo { method() {} }';
      
      vi.mocked(mockDriver.query).mockResolvedValue('Structure analysis result');
      
      const result = await workflow.analyze(mockDriver, content, {
        type: 'structure',
        depth: 'shallow'
      });
      
      expect(result.output).toBe('Structure analysis result');
      expect(result.context.analysisType).toBe('structure');
      expect(result.metadata?.analysisType).toBe('structure');
    });

    it('performs content analysis', async () => {
      const workflow = new AnalysisWorkflow();
      
      vi.mocked(mockDriver.query).mockResolvedValue('Content analysis result');
      
      const result = await workflow.analyze(mockDriver, 'Sample text', {
        type: 'content'
      });
      
      expect(result.output).toBe('Content analysis result');
      expect(result.context.analysisType).toBe('content');
    });

    it('performs quality analysis with criteria', async () => {
      const workflow = new AnalysisWorkflow();
      
      vi.mocked(mockDriver.query).mockResolvedValue('Quality assessment');
      
      const result = await workflow.analyze(mockDriver, 'Code sample', {
        type: 'quality',
        criteria: ['readability', 'performance']
      });
      
      expect(result.output).toBe('Quality assessment');
      expect(result.context.criteria).toEqual(['readability', 'performance']);
    });

    it('performs comprehensive analysis', async () => {
      const workflow = new AnalysisWorkflow();
      
      vi.mocked(mockDriver.query).mockResolvedValue('Comprehensive report');
      
      const result = await workflow.analyze(mockDriver, 'Full document', {
        type: 'comprehensive'
      });
      
      expect(result.output).toBe('Comprehensive report');
    });
  });

  describe('depth levels', () => {
    it('performs shallow analysis in single pass', async () => {
      const workflow = new AnalysisWorkflow();
      const content = Array(200).fill('line').join('\n');
      
      vi.mocked(mockDriver.query).mockResolvedValue('Shallow analysis');
      
      const result = await workflow.analyze(mockDriver, content, {
        type: 'structure',
        depth: 'shallow'
      });
      
      expect(mockDriver.query).toHaveBeenCalledTimes(1);
      expect(result.output).toBe('Shallow analysis');
      expect(result.metadata?.depth).toBe('shallow');
    });

    it('performs deep analysis with streaming', async () => {
      const workflow = new AnalysisWorkflow();
      const content = Array(500).fill('line').join('\n');
      
      let callCount = 0;
      vi.mocked(mockDriver.query).mockImplementation(() => {
        callCount++;
        return Promise.resolve(`Deep analysis iteration ${callCount}`);
      });
      
      const result = await workflow.analyze(mockDriver, content, {
        type: 'structure',
        depth: 'deep',
        chunkSize: 100
      });
      
      expect(mockDriver.query).toHaveBeenCalledTimes(2); // 500 lines / 100 = 5 chunks, processed in batches of 3
      expect(result.output).toBe('Deep analysis iteration 2');
      expect(result.metadata?.depth).toBe('deep');
      expect(result.metadata?.iterations).toBe(2);
    });
  });

  describe('chunk preparation', () => {
    it('prepares chunks from content', async () => {
      const workflow = new AnalysisWorkflow();
      const context: AnalysisContext = {
        content: Array(10).fill('line').join('\n')
      };
      
      vi.mocked(mockDriver.query).mockResolvedValue('Analysis result');
      
      const result = await workflow.execute(mockDriver, context, {
        type: 'structure',
        chunkSize: 3
      });
      
      expect(result.context.chunks).toBeDefined();
      expect(result.context.chunks?.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('preserves context for recovery', async () => {
      const workflow = new AnalysisWorkflow();
      const context: AnalysisContext = {
        content: 'test content',
        analysisType: 'structure'
      };
      
      vi.mocked(mockDriver.query).mockRejectedValue(new Error('Analysis failed'));
      
      try {
        await workflow.execute(mockDriver, context, {
          type: 'structure'
        });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Analysis failed');
        expect(error.context).toEqual(context);
      }
    });

    it('throws error when no content provided', async () => {
      const workflow = new AnalysisWorkflow();
      const context: AnalysisContext = {};
      
      await expect(
        workflow.execute(mockDriver, context, { type: 'structure' })
      ).rejects.toThrow('No content to analyze');
    });
  });

  describe('context updates', () => {
    it('updates context with analysis results', async () => {
      const workflow = new AnalysisWorkflow();
      const context: AnalysisContext = {
        content: 'analyze this'
      };
      
      vi.mocked(mockDriver.query).mockResolvedValue('Analysis complete');
      
      const result = await workflow.execute(mockDriver, context, {
        type: 'content',
        depth: 'shallow'
      });
      
      expect(result.context.currentAnalysis).toBe('Analysis complete');
      expect(result.context.analysisType).toBe('content');
    });

    it('maintains state in deep analysis', async () => {
      const workflow = new AnalysisWorkflow();
      const context: AnalysisContext = {
        chunks: [
          { content: 'chunk1', partOf: 'section-1' },
          { content: 'chunk2', partOf: 'section-2' },
          { content: 'chunk3', partOf: 'section-3' },
          { content: 'chunk4', partOf: 'section-4' }
        ]
      };
      
      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('First batch')
        .mockResolvedValueOnce('Second batch');
      
      const result = await workflow.execute(mockDriver, context, {
        type: 'comprehensive',
        depth: 'deep'
      });
      
      expect(result.context.state?.content).toBe('Second batch');
      expect(result.context.state?.usage).toBe('Second batch'.length);
    });
  });
});