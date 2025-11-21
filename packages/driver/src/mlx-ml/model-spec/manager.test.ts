import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelSpecManager } from './manager.js';
import type { MlxMessage } from '../process/types.js';
import type { ModelSpec } from './types.js';

describe('ModelSpecManager', () => {
  describe('determineApi', () => {
    // モックプロセスを作成
    const createMockProcess = () => ({
      ensureInitialized: vi.fn(),
      getCapabilities: vi.fn(),
      chat: vi.fn(),
      completion: vi.fn(),
      exit: vi.fn()
    }) as any;

    it('should return "chat" when apiStrategy is "force-chat"', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'force-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should return "completion" when apiStrategy is "force-completion"', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'force-completion',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should prefer chat when apiStrategy is "prefer-chat" and messages are valid', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'prefer-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should fallback to completion when apiStrategy is "prefer-chat" but messages are invalid', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'prefer-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      // 最後がassistantなので無効
      const messages: MlxMessage[] = [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'response' }
      ];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when apiStrategy is "prefer-completion"', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'prefer-completion',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when chat template is not available', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: false,
          supportsCompletion: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "chat" when completion is not supported', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: false
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should return "completion" for invalid messages when both APIs available (auto)', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      // 最後がassistantなので無効
      const messages: MlxMessage[] = [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'response' }
      ];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when many restrictions exist (auto)', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          singleSystemAtStart: true,
          alternatingTurns: true,
          requiresUserLast: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      // 3つ以上の制限がある場合はcompletionを優先
      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "chat" for valid messages with few restrictions (auto)', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      // 制限が少なく、メッセージが有効な場合はchat
      expect(manager.determineApi(messages)).toBe('chat');
    });
  });

  describe('canUseChat and canUseCompletion', () => {
    const createMockProcess = () => ({
      ensureInitialized: vi.fn(),
      getCapabilities: vi.fn(),
      chat: vi.fn(),
      completion: vi.fn(),
      exit: vi.fn()
    }) as any;

    it('should return true for canUseChat when chat template is available', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        capabilities: {
          hasApplyChatTemplate: true
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      expect(manager.canUseChat()).toBe(true);
    });

    it('should return false for canUseChat when chat template is not available', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        capabilities: {
          hasApplyChatTemplate: false
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      expect(manager.canUseChat()).toBe(false);
    });

    it('should return true for canUseCompletion by default', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        capabilities: {}
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      expect(manager.canUseCompletion()).toBe(true);
    });

    it('should return false for canUseCompletion when explicitly disabled', () => {
      const process = createMockProcess();
      const spec: Partial<ModelSpec> = {
        capabilities: {
          supportsCompletion: false
        }
      };

      const manager = new ModelSpecManager('test-model', process, spec);
      expect(manager.canUseCompletion()).toBe(false);
    });
  });
});
