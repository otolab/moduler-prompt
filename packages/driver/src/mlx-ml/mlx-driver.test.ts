import { describe, it, expect, vi } from 'vitest';
import { MlxDriver } from './mlx-driver.js';

// Mock the MlxProcess
vi.mock('./process/index.js', () => ({
  MlxProcess: vi.fn().mockImplementation(() => ({
    getCapabilities: vi.fn().mockResolvedValue({
      methods: ['chat', 'completion', 'format_test', 'capabilities'],
      special_tokens: {
        eod: { text: '<|endoftext|>', id: 0 },
        system: {
          start: { text: '<|system|>', id: 1 },
          end: { text: '<|/system|>', id: 2 }
        },
        user: {
          start: { text: '<|user|>', id: 3 },
          end: { text: '<|/user|>', id: 4 }
        },
        assistant: {
          start: { text: '<|assistant|>', id: 5 },
          end: { text: '<|/assistant|>', id: 6 }
        },
        code: {
          start: { text: '<|code_start|>', id: 7 },
          end: { text: '<|code_end|>', id: 8 }
        },
        thinking: {
          start: { text: '<|thinking|>', id: 9 },
          end: { text: '</thinking>', id: 10 }
        }
      },
      features: {
        apply_chat_template: true,
        vocab_size: 32000,
        model_max_length: 4096,
        chat_template: {
          template_string: 'some_template',
          supported_roles: ['system', 'user', 'assistant'],
          preview: null,
          constraints: {}
        }
      }
    }),
    chat: vi.fn(),
    exit: vi.fn()
  }))
}));

describe('MlxDriver', () => {
  describe('getSpecialTokens', () => {
    it('should retrieve special tokens from the process', async () => {
      const driver = new MlxDriver({
        model: 'test-model'
      });

      const tokens = await driver.getSpecialTokens();

      expect(tokens).toBeDefined();
      expect(tokens).toHaveProperty('eod');
      expect(tokens).toHaveProperty('system');
      expect(tokens).toHaveProperty('user');
      expect(tokens).toHaveProperty('assistant');
      expect(tokens).toHaveProperty('code');
      expect(tokens).toHaveProperty('thinking');
    });

    it('should cache capabilities after first retrieval', async () => {
      const driver = new MlxDriver({
        model: 'test-model'
      });

      // First call
      const tokens1 = await driver.getSpecialTokens();
      // Second call - should use cached value
      const tokens2 = await driver.getSpecialTokens();

      expect(tokens1).toBe(tokens2);
      // Verify getCapabilities was only called once
      const process = (driver as any).process;
      expect(process.getCapabilities).toHaveBeenCalledTimes(1);
    });

    it('should return null on error', async () => {
      const driver = new MlxDriver({
        model: 'test-model'
      });

      // Mock error
      const process = (driver as any).process;
      process.getCapabilities.mockRejectedValueOnce(new Error('Process error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tokens = await driver.getSpecialTokens();

      expect(tokens).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get MLX capabilities:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should validate token structure', async () => {
      const driver = new MlxDriver({
        model: 'test-model'
      });

      const tokens = await driver.getSpecialTokens();

      if (tokens) {
        // Check single token structure
        expect(tokens.eod).toHaveProperty('text');
        expect(tokens.eod).toHaveProperty('id');

        // Check paired token structure  
        const systemToken = tokens.system as any;
        expect(systemToken).toHaveProperty('start');
        expect(systemToken).toHaveProperty('end');
        expect(systemToken.start).toHaveProperty('text');
        expect(systemToken.start).toHaveProperty('id');
        expect(systemToken.end).toHaveProperty('text');
        expect(systemToken.end).toHaveProperty('id');
      }
    });
  });
});