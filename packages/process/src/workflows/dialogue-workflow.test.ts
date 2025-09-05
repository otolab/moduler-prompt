import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogueWorkflow } from './dialogue-workflow.js';
import type { AIDriver } from './types.js';
import type { DialogueWorkflowContext } from './dialogue-workflow.js';

describe('DialogueWorkflow', () => {
  const mockDriver: AIDriver = {
    query: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single-pass response', () => {
    it('generates response directly', async () => {
      const workflow = new DialogueWorkflow();
      const context: DialogueWorkflowContext = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };
      
      vi.mocked(mockDriver.query).mockResolvedValue('Hi there!');
      
      const result = await workflow.execute(mockDriver, context, {
        twoPass: false
      });
      
      expect(result.output).toBe('Hi there!');
      expect(result.context.messages).toHaveLength(2);
      expect(result.context.messages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!'
      });
      expect(mockDriver.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('two-pass response', () => {
    it('generates preparation notes then response', async () => {
      const workflow = new DialogueWorkflow();
      const context: DialogueWorkflowContext = {
        messages: [
          { role: 'user', content: 'Explain quantum computing' }
        ]
      };
      
      vi.mocked(mockDriver.query)
        .mockResolvedValueOnce('Technical explanation preparation')
        .mockResolvedValueOnce('Quantum computing is...');
      
      const result = await workflow.execute(mockDriver, context, {
        twoPass: true
      });
      
      expect(result.output).toBe('Quantum computing is...');
      expect(result.context.preparationNote?.content).toBe('Technical explanation preparation');
      expect(result.metadata?.twoPass).toBe(true);
      expect(mockDriver.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('respond convenience method', () => {
    it('adds user message and gets response', async () => {
      const workflow = new DialogueWorkflow();
      
      vi.mocked(mockDriver.query).mockResolvedValue('Response to question');
      
      const result = await workflow.respond(
        mockDriver,
        'What is AI?',
        { messages: [] }
      );
      
      expect(result.context.messages).toHaveLength(2);
      expect(result.context.messages[0].content).toBe('What is AI?');
      expect(result.output).toBe('Response to question');
    });
  });

  describe('error handling', () => {
    it('preserves context on error', async () => {
      const workflow = new DialogueWorkflow();
      const context: DialogueWorkflowContext = {
        messages: [{ role: 'user', content: 'Test' }]
      };
      
      vi.mocked(mockDriver.query).mockRejectedValue(new Error('API Error'));
      
      try {
        await workflow.execute(mockDriver, context);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('API Error');
        expect(error.context).toEqual(context);
      }
    });
  });
});