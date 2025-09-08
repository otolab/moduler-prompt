/**
 * Driver Factory Helper
 * ドライバファクトリの登録を支援するヘルパー関数
 * 
 * 使用例:
 * ```typescript
 * import { MlxDriver, OpenAIDriver } from '@moduler-prompt/driver';
 * import { DriverRegistry, registerDriverFactories } from '@moduler-prompt/utils';
 * 
 * const registry = new DriverRegistry();
 * registerDriverFactories(registry, {
 *   MlxDriver,
 *   OpenAIDriver,
 *   // ... 他のドライバクラス
 * });
 * ```
 */

import type { DriverRegistry } from './registry.js';
import type { DriverConfig } from './types.js';

/**
 * ドライバクラスのマップ型
 */
export interface DriverClasses {
  MlxDriver?: any;
  OpenAIDriver?: any;
  AnthropicDriver?: any;
  VertexAIDriver?: any;
  EchoDriver?: any;
  [key: string]: any;
}

/**
 * 標準ドライバファクトリを登録
 */
export function registerDriverFactories(
  registry: DriverRegistry,
  drivers: DriverClasses
): void {
  // MLX Driver
  if (drivers.MlxDriver) {
    registry.registerFactory('mlx', (config: DriverConfig) => {
      return new drivers.MlxDriver({
        model: config.model.model,
        defaultOptions: config.options
      });
    });
  }

  // OpenAI Driver
  if (drivers.OpenAIDriver) {
    registry.registerFactory('openai', (config: DriverConfig) => {
      return new drivers.OpenAIDriver({
        apiKey: config.credentials?.apiKey || process.env.OPENAI_API_KEY || '',
        model: config.model.model,
        defaultOptions: config.options
      });
    });
  }

  // Anthropic Driver
  if (drivers.AnthropicDriver) {
    registry.registerFactory('anthropic', (config: DriverConfig) => {
      return new drivers.AnthropicDriver({
        apiKey: config.credentials?.apiKey || process.env.ANTHROPIC_API_KEY || '',
        model: config.model.model,
        defaultOptions: config.options
      });
    });
  }

  // VertexAI Driver
  if (drivers.VertexAIDriver) {
    registry.registerFactory('vertexai', (config: DriverConfig) => {
      return new drivers.VertexAIDriver({
        project: config.credentials?.project || process.env.VERTEX_AI_PROJECT,
        location: config.credentials?.location || process.env.VERTEX_AI_LOCATION || 'us-central1',
        model: config.model.model,
        defaultOptions: config.options
      });
    });
  }

  // Echo Driver (for testing)
  if (drivers.EchoDriver) {
    registry.registerFactory('echo', (config: DriverConfig) => {
      return new drivers.EchoDriver({
        format: config.options?.format || 'text',
        includeMetadata: config.options?.includeMetadata,
        simulateUsage: config.options?.simulateUsage,
        formatterOptions: config.options?.formatterOptions
      });
    });
  }
}