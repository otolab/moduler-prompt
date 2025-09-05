import { describe, it, expect } from 'vitest';
import { compile } from '@moduler-prompt/core';
import { TestDriver } from '@moduler-prompt/driver';
import { DialogueWorkflow } from './workflows/dialogue-workflow.js';
import { SummarizeWorkflow } from './workflows/summarize-workflow.js';

describe('Workflow-Driver Integration', () => {
  describe('DialogueWorkflow with TestDriver', () => {
    it('executes dialogue workflow with test driver', async () => {
      const driver = new TestDriver({
        responses: ['Hello from AI!']
      });
      
      const workflow = new DialogueWorkflow();
      const context = {
        messages: [
          { role: 'user' as const, content: 'Hi there' }
        ]
      };
      
      const result = await workflow.execute(driver, context);
      
      expect(result.output).toBe('Hello from AI!');
      expect(result.context.messages).toHaveLength(2);
      expect(result.context.messages[1]).toEqual({
        role: 'assistant',
        content: 'Hello from AI!'
      });
    });
    
    it('handles two-pass dialogue', async () => {
      // Two-pass requires two responses: preparation notes and final response
      const driver = new TestDriver({
        responses: [
          'Preparation notes for complex response',
          'Final thoughtful response'
        ]
      });
      
      const workflow = new DialogueWorkflow();
      const context = {
        messages: [
          { role: 'user' as const, content: 'Complex question' }
        ]
      };
      
      const result = await workflow.execute(driver, context, {
        twoPass: true
      });
      
      expect(result.output).toBe('Final thoughtful response');
      expect(result.context.preparationNote?.content).toBe('Preparation notes for complex response');
      expect(result.metadata?.twoPass).toBe(true);
      expect(result.metadata?.preparationNoteLength).toBeGreaterThan(0);
    });

    it('handles multiple conversation turns', async () => {
      const driver = new TestDriver({
        responses: [
          'First response',
          'Second response',
          'Third response'
        ]
      });
      
      const workflow = new DialogueWorkflow();
      let context = { messages: [] };
      
      // First turn
      const result1 = await workflow.respond(driver, 'Hello', context);
      expect(result1.output).toBe('First response');
      context = result1.context;
      
      // Second turn
      const result2 = await workflow.respond(driver, 'How are you?', context);
      expect(result2.output).toBe('Second response');
      context = result2.context;
      
      // Third turn
      const result3 = await workflow.respond(driver, 'Goodbye', context);
      expect(result3.output).toBe('Third response');
      
      // Check conversation history
      expect(result3.context.messages).toHaveLength(6); // 3 user + 3 assistant
    });
  });
  
  describe('SummarizeWorkflow with TestDriver', () => {
    it('executes summarize workflow', async () => {
      // Summarize workflow may make multiple calls for analysis and summarization
      const driver = new TestDriver({
        responses: [
          'Analysis of content',  // Analysis phase
          'Summary of content'    // Summarization phase
        ]
      });
      
      const workflow = new SummarizeWorkflow();
      const chunks = [
        { content: 'This is a long text', partOf: 'source' },
        { content: 'that needs to be summarized.', partOf: 'source' }
      ];
      
      const result = await workflow.summarize(driver, chunks, {
        targetTokens: 50,
        enableAnalysis: true
      });
      
      expect(result.output).toBe('Summary of content');
      expect(result.context.phase).toBe('complete');
    });

    it('handles iterative summarization', async () => {
      // 10 chunks processed in batches of 3:
      // Analysis: 4 calls (0-2, 3-5, 6-8, 9)
      // Summarization: 4 calls (0-2, 3-5, 6-8, 9)
      const driver = new TestDriver({
        responses: [
          'Analysis batch 1',     // Analysis chunks 0-2
          'Analysis batch 2',     // Analysis chunks 3-5
          'Analysis batch 3',     // Analysis chunks 6-8
          'Analysis batch 4',     // Analysis chunk 9
          'Summary batch 1',      // Summarize chunks 0-2
          'Summary batch 2',      // Summarize chunks 3-5
          'Summary batch 3',      // Summarize chunks 6-8
          'Final summary'         // Summarize chunk 9
        ]
      });
      
      const workflow = new SummarizeWorkflow();
      
      // Create many chunks
      const chunks = [];
      for (let i = 0; i < 10; i++) {
        chunks.push({
          content: `Chunk ${i}: This is content that needs summarization.`,
          partOf: 'source'
        });
      }
      
      // First pass with analysis
      const result1 = await workflow.summarize(driver, chunks, {
        targetTokens: 100,
        enableAnalysis: true
      });
      expect(result1.output).toBe('Final summary');
      expect(result1.context.phase).toBe('complete');
    });
  });
  
  describe('CompiledPrompt handling', () => {
    it('correctly converts CompiledPrompt to elements', async () => {
      const driver = new TestDriver({
        responses: ['Test response']
      });
      
      // Create a simple module and compile it
      const module = {
        objective: ['Test objective'],
        instructions: ['Do something'],
        messages: [
          (context: any) => ({
            type: 'message' as const,
            role: 'user' as const,
            content: 'Test message'
          })
        ]
      };
      
      const compiledPrompt = compile(module, {});
      
      // Query with compiled prompt directly
      const result = await driver.query(compiledPrompt);
      
      expect(result).toBe('Test response');
    });

    it('handles multiple queries with compiled prompts', async () => {
      const driver = new TestDriver({
        responses: ['First', 'Second', 'Third']
      });
      
      const prompts = [
        compile({ instructions: ['Task 1'] }, {}),
        compile({ instructions: ['Task 2'] }, {}),
        compile({ instructions: ['Task 3'] }, {})
      ];
      
      const results = [];
      for (const prompt of prompts) {
        results.push(await driver.query(prompt));
      }
      
      expect(results).toEqual(['First', 'Second', 'Third']);
    });
  });
  
  describe('Error handling', () => {
    it('throws error when responses exhausted', async () => {
      const driver = new TestDriver({
        responses: ['Only response']
      });
      
      const workflow = new DialogueWorkflow();
      
      // First call succeeds
      await workflow.execute(driver, {
        messages: [{ role: 'user' as const, content: 'First' }]
      });
      
      // Second call should fail (driver has no more responses)
      await expect(
        workflow.execute(driver, {
          messages: [{ role: 'user' as const, content: 'Second' }]
        })
      ).rejects.toThrow('No more responses available');
    });

    it('preserves context on workflow error', async () => {
      const driver = new TestDriver({
        responses: () => {
          throw new Error('No more responses available');
        }
      });
      
      const workflow = new DialogueWorkflow();
      const context = {
        messages: [
          { role: 'user' as const, content: 'Test' }
        ]
      };
      
      try {
        await workflow.execute(driver, context);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('No more responses available');
        expect(error.context).toEqual(context);
      }
    });

    it('handles two-pass error on second pass', async () => {
      let callCount = 0;
      const driver = new TestDriver({
        responses: () => {
          callCount++;
          if (callCount === 1) {
            return 'First pass success';
          }
          throw new Error('No more responses available');
        }
      });
      
      const workflow = new DialogueWorkflow();
      const context = {
        messages: [{ role: 'user' as const, content: 'Test' }]
      };
      
      await expect(
        workflow.execute(driver, context, { twoPass: true })
      ).rejects.toThrow('No more responses available');
    });
  });

  describe('Stream workflow integration', () => {
    it('streams responses character by character', async () => {
      const driver = new TestDriver({
        responses: ['Streamed']
      });
      
      const prompt = compile({ instructions: ['Stream test'] }, {});
      
      const chars: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
        chars.push(char);
      }
      
      expect(chars).toEqual(['S', 't', 'r', 'e', 'a', 'm', 'e', 'd']);
    });

    it('handles multiple stream queries', async () => {
      const driver = new TestDriver({
        responses: ['First', 'Second']
      });
      
      const prompt = compile({ instructions: ['Test'] }, {});
      
      // First stream
      const chars1: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
        chars1.push(char);
      }
      expect(chars1.join('')).toBe('First');
      
      // Second stream
      const chars2: string[] = [];
      for await (const char of driver.streamQuery(prompt)) {
        chars2.push(char);
      }
      expect(chars2.join('')).toBe('Second');
    });
  });
});