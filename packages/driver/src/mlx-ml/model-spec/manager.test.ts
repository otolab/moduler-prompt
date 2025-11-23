import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MlxModelConfigManager } from './manager.js';
import type { MlxMessage } from '../process/types.js';
import type { MlxModelConfig } from './types.js';

describe('MlxModelConfigManager', () => {
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
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'force-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should return "completion" when apiStrategy is "force-completion"', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'force-completion',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should prefer chat when apiStrategy is "prefer-chat" and messages are valid', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'prefer-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should fallback to completion when apiStrategy is "prefer-chat" but messages are invalid', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'prefer-chat',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      // 最後がassistantなので無効
      const messages: MlxMessage[] = [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'response' }
      ];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when apiStrategy is "prefer-completion"', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'prefer-completion',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when chat template is not available', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: false,
          supportsCompletion: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "chat" when completion is not supported', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: false
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      expect(manager.determineApi(messages)).toBe('chat');
    });

    it('should return "completion" for invalid messages when both APIs available (auto)', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      // 最後がassistantなので無効
      const messages: MlxMessage[] = [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'response' }
      ];

      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "completion" when many restrictions exist (auto)', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
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

      const manager = new MlxModelConfigManager('test-model', process, config);
      const messages: MlxMessage[] = [{ role: 'user', content: 'test' }];

      // 3つ以上の制限がある場合はcompletionを優先
      expect(manager.determineApi(messages)).toBe('completion');
    });

    it('should return "chat" for valid messages with few restrictions (auto)', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        apiStrategy: 'auto',
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        },
        chatRestrictions: {
          requiresUserLast: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
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
      const config: Partial<MlxModelConfig> = {
        capabilities: {
          hasApplyChatTemplate: true
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      expect(manager.canUseChat()).toBe(true);
    });

    it('should return false for canUseChat when chat template is not available', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        capabilities: {
          hasApplyChatTemplate: false
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      expect(manager.canUseChat()).toBe(false);
    });

    it('should return true for canUseCompletion by default', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        capabilities: {}
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      expect(manager.canUseCompletion()).toBe(true);
    });

    it('should return false for canUseCompletion when explicitly disabled', () => {
      const process = createMockProcess();
      const config: Partial<MlxModelConfig> = {
        capabilities: {
          supportsCompletion: false
        }
      };

      const manager = new MlxModelConfigManager('test-model', process, config);
      expect(manager.canUseCompletion()).toBe(false);
    });
  });

  describe('custom spec override (Issue #29)', () => {
    const createMockProcess = () => ({
      ensureInitialized: vi.fn(),
      getCapabilities: vi.fn().mockResolvedValue({
        features: {
          apply_chat_template: true
        },
        special_tokens: {}
      }),
      formatTest: vi.fn().mockResolvedValue({
        success: true
      }),
      chat: vi.fn(),
      completion: vi.fn(),
      exit: vi.fn()
    }) as any;

    it('force-completion should override preset prefer-chat', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'gemma-2-2b-it-4bit',
        process,
        { apiStrategy: 'force-completion' }
      );

      await manager.initialize();

      const api = manager.determineApi([
        { role: 'user', content: 'test' }
      ]);

      expect(api).toBe('completion');
      expect(manager.getConfig().apiStrategy).toBe('force-completion');
    });

    it('chatRestrictions: undefined should clear preset restrictions', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'gemma-2-2b-it-4bit',
        process,
        { chatRestrictions: undefined }
      );

      await manager.initialize();

      const config = manager.getConfig();
      expect(config.chatRestrictions).toBeUndefined();
    });

    it('custom apiStrategy should not be overwritten by initialize()', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'gemma-2-2b-it-4bit',
        process,
        { apiStrategy: 'force-completion' }
      );

      // Before initialize
      expect(manager.getConfig().apiStrategy).toBe('force-completion');

      await manager.initialize();

      // After initialize - should still be force-completion
      const config = manager.getConfig();
      expect(config.apiStrategy).toBe('force-completion');
    });

    it('custom chatRestrictions should override preset', () => {
      const process = createMockProcess();
      const customRestrictions = {
        requiresUserLast: false
      };
      const manager = new MlxModelConfigManager(
        'gemma-2-2b-it-4bit',
        process,
        { chatRestrictions: customRestrictions }
      );

      const config = manager.getConfig();
      expect(config.chatRestrictions).toEqual(customRestrictions);
    });

    it('custom capabilities should be merged with preset', () => {
      const process = createMockProcess();
      const customCapabilities = {
        hasApplyChatTemplate: false
      };
      const manager = new MlxModelConfigManager(
        'test-model',
        process,
        { capabilities: customCapabilities }
      );

      const config = manager.getConfig();
      expect(config.capabilities?.hasApplyChatTemplate).toBe(false);
    });
  });

  describe('custom determineApi logic', () => {
    const createMockProcess = () => ({
      ensureInitialized: vi.fn(),
      getCapabilities: vi.fn().mockResolvedValue({
        capabilities: {
          hasApplyChatTemplate: true,
          supportsCompletion: true
        }
      }),
      chat: vi.fn(),
      completion: vi.fn(),
      exit: vi.fn()
    }) as any;

    it('customProcessor.determineApi() が completion を返す場合、それが優先される', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'test-model',
        process,
        {
          customProcessor: {
            determineApi: () => 'completion'
          }
        }
      );

      await manager.initialize();

      const api = manager.determineApi([
        { role: 'user', content: 'test' }
      ]);

      expect(api).toBe('completion');
    });

    it('customProcessor.determineApi() が chat を返す場合、それが優先される', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'test-model',
        process,
        {
          apiStrategy: 'prefer-completion',  // これがあっても
          customProcessor: {
            determineApi: () => 'chat'  // カスタムが優先
          }
        }
      );

      await manager.initialize();

      const api = manager.determineApi([
        { role: 'user', content: 'test' }
      ]);

      expect(api).toBe('chat');
    });

    it('customProcessor.determineApi() が undefined を返す場合、デフォルトロジックが実行される', async () => {
      const process = createMockProcess();
      const manager = new MlxModelConfigManager(
        'test-model',
        process,
        {
          apiStrategy: 'prefer-completion',
          customProcessor: {
            determineApi: () => undefined  // デフォルトに委譲
          }
        }
      );

      await manager.initialize();

      const api = manager.determineApi([
        { role: 'user', content: 'test' }
      ]);

      // apiStrategy: 'prefer-completion' が適用される
      expect(api).toBe('completion');
    });

    it('customProcessor.determineApi() にコンテキスト情報が正しく渡される', async () => {
      const process = createMockProcess();
      let capturedContext: any = null;

      const manager = new MlxModelConfigManager(
        'test-model',
        process,
        {
          apiStrategy: 'prefer-chat',
          chatRestrictions: {
            singleSystemAtStart: true
          },
          capabilities: {
            hasApplyChatTemplate: true,
            supportsCompletion: true
          },
          customProcessor: {
            determineApi: (context) => {
              capturedContext = context;
              return undefined;
            }
          }
        }
      );

      await manager.initialize();

      const messages = [
        { role: 'system', content: 'test' },
        { role: 'user', content: 'test' }
      ];
      manager.determineApi(messages);

      expect(capturedContext).toBeDefined();
      expect(capturedContext.messages).toEqual(messages);
      expect(capturedContext.apiStrategy).toBe('prefer-chat');
      expect(capturedContext.chatRestrictions?.singleSystemAtStart).toBe(true);
      expect(capturedContext.capabilities.hasApplyChatTemplate).toBe(true);
      expect(capturedContext.capabilities.supportsCompletion).toBe(true);
      expect(capturedContext.validation).toBeDefined();
    });
  });
});
