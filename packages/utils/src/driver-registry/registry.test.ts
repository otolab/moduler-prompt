/**
 * Driver Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DriverRegistry } from './registry.js';
import type { DriverConfig, DriverSelectionCriteria } from './types.js';

describe('DriverRegistry', () => {
  let registry: DriverRegistry;

  beforeEach(() => {
    registry = new DriverRegistry();
  });

  describe('registerDriver', () => {
    it('should register a driver configuration', () => {
      const config: DriverConfig = {
        id: 'test-driver',
        name: 'Test Driver',
        model: {
          model: 'test-model',
          provider: 'echo',
          capabilities: ['local', 'fast'],
          maxInputTokens: 1000,
          maxOutputTokens: 500,
        },
      };

      registry.registerDriver(config);
      const retrieved = registry.getDriver('test-driver');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-driver');
      expect(retrieved?.model.capabilities).toContain('local');
    });

    it('should set default values for enabled and priority', () => {
      const config: DriverConfig = {
        id: 'test-driver',
        name: 'Test Driver',
        model: {
          model: 'test-model',
          provider: 'echo',
          capabilities: [],
        },
      };

      registry.registerDriver(config);
      const retrieved = registry.getDriver('test-driver');
      
      expect(retrieved?.model.enabled).toBe(true);
      expect(retrieved?.model.priority).toBe(0);
    });
  });

  describe('selectDriver', () => {
    beforeEach(() => {
      // Register test drivers
      registry.registerDriver({
        id: 'local-fast',
        name: 'Local Fast Driver',
        model: {
          model: 'local-fast-model',
          provider: 'mlx',
          capabilities: ['local', 'fast', 'streaming'],
          priority: 10,
        },
      });

      registry.registerDriver({
        id: 'cloud-powerful',
        name: 'Cloud Powerful Driver',
        model: {
          model: 'cloud-model',
          provider: 'openai',
          capabilities: ['streaming', 'tools', 'reasoning', 'large-context'],
          maxInputTokens: 128000,
          priority: 20,
        },
      });

      registry.registerDriver({
        id: 'japanese-specialized',
        name: 'Japanese Specialized Driver',
        model: {
          model: 'japanese-model',
          provider: 'mlx',
          capabilities: ['local', 'japanese', 'chat'],
          priority: 15,
        },
      });
    });

    it('should select driver with required capabilities', () => {
      const criteria: DriverSelectionCriteria = {
        requiredCapabilities: ['local', 'fast'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.id).toBe('local-fast');
      expect(result?.score).toBeGreaterThan(0);
    });

    it('should prefer driver with higher priority', () => {
      const criteria: DriverSelectionCriteria = {
        requiredCapabilities: ['streaming'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.id).toBe('cloud-powerful'); // Higher priority
    });

    it('should exclude drivers with excluded capabilities', () => {
      const criteria: DriverSelectionCriteria = {
        requiredCapabilities: ['streaming'],
        excludeCapabilities: ['tools'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.id).toBe('local-fast');
    });

    it('should filter by provider', () => {
      const criteria: DriverSelectionCriteria = {
        providers: ['mlx'],
        requiredCapabilities: ['local'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.model.provider).toBe('mlx');
    });

    it('should exclude specific providers', () => {
      const criteria: DriverSelectionCriteria = {
        excludeProviders: ['openai'],
        requiredCapabilities: ['streaming'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.model.provider).not.toBe('openai');
    });

    it('should check minimum token requirements', () => {
      const criteria: DriverSelectionCriteria = {
        minInputTokens: 100000,
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.id).toBe('cloud-powerful');
    });

    it('should prefer local when preferLocal is true', () => {
      const criteria: DriverSelectionCriteria = {
        preferLocal: true,
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.driver.model.capabilities).toContain('local');
    });

    it('should return null when no driver matches', () => {
      const criteria: DriverSelectionCriteria = {
        requiredCapabilities: ['non-existent-capability'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeNull();
    });

    it('should include warnings for missing preferred capabilities', () => {
      const criteria: DriverSelectionCriteria = {
        requiredCapabilities: ['local'],
        preferredCapabilities: ['tools', 'vision'],
      };

      const result = registry.selectDriver(criteria);
      
      expect(result).toBeDefined();
      expect(result?.warnings).toBeDefined();
      expect(result?.warnings?.[0]).toContain('Missing preferred capabilities');
    });
  });

  describe('getDefaultDriver', () => {
    it('should return first enabled driver when no default is set', () => {
      registry.registerDriver({
        id: 'driver1',
        name: 'Driver 1',
        model: {
          model: 'model1',
          provider: 'echo',
          capabilities: [],
          enabled: false,
        },
      });

      registry.registerDriver({
        id: 'driver2',
        name: 'Driver 2',
        model: {
          model: 'model2',
          provider: 'echo',
          capabilities: [],
          enabled: true,
        },
      });

      const defaultDriver = registry.getDefaultDriver();
      
      expect(defaultDriver).toBeDefined();
      expect(defaultDriver?.id).toBe('driver2');
    });
  });

  describe('createDriver', () => {
    it('should throw error when no factory registered', async () => {
      const config: DriverConfig = {
        id: 'test',
        name: 'Test',
        model: {
          model: 'test',
          provider: 'echo',
          capabilities: [],
        },
      };

      await expect(registry.createDriver(config)).rejects.toThrow(
        'No factory registered for provider: echo'
      );
    });

    it('should create driver when factory is registered', async () => {
      // モックファクトリを登録
      const mockDriver = {
        query: async () => ({ content: 'test' }),
        streamQuery: undefined,
        close: undefined
      };
      
      registry.registerFactory('echo', async () => mockDriver);
      
      const config: DriverConfig = {
        id: 'echo-test',
        name: 'Echo Test',
        model: {
          model: 'echo',
          provider: 'echo',
          capabilities: ['local'],
        },
      };

      const driver = await registry.createDriver(config);
      
      expect(driver).toBeDefined();
      expect(driver).toBe(mockDriver);
    });
  });

  describe('selectAndCreateDriver', () => {
    it('should return null when no factory registered', async () => {
      registry.registerDriver({
        id: 'test-driver',
        name: 'Test Driver',
        model: {
          model: 'test',
          provider: 'echo',
          capabilities: ['local', 'fast'],
        },
      });

      const driver = await registry.selectAndCreateDriver(['local', 'fast']);
      
      expect(driver).toBeNull();
    });

    it('should select and create driver when factory is registered', async () => {
      // モックファクトリを登録
      const mockDriver = {
        query: async () => ({ content: 'test' }),
        streamQuery: undefined,
        close: undefined
      };
      
      registry.registerFactory('echo', async () => mockDriver);
      
      registry.registerDriver({
        id: 'test-driver',
        name: 'Test Driver',
        model: {
          model: 'test',
          provider: 'echo',
          capabilities: ['local', 'fast'],
        },
      });

      const driver = await registry.selectAndCreateDriver(['local', 'fast']);
      
      expect(driver).toBeDefined();
      expect(driver).toBe(mockDriver);
    });

    it('should return null when no matching driver', async () => {
      const driver = await registry.selectAndCreateDriver(['non-existent']);
      
      expect(driver).toBeNull();
    });
  });
});