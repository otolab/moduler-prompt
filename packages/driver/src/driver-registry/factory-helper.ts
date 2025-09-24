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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MlxDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OpenAIDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnthropicDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VertexAIDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EchoDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TestDriver?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        formatterOptions: config.options?.formatterOptions,
        streamChunkSize: config.options?.streamChunkSize
      });
    });
  }

  // Test Driver (for unit testing)
  if (drivers.TestDriver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registry.registerFactory('test' as any, (config: DriverConfig) => {
      return new drivers.TestDriver({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responses: config.options?.responses as any,
        delay: config.options?.delay as number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatterOptions: config.options?.formatterOptions as any,
        preferMessageFormat: config.options?.preferMessageFormat as boolean
      });
    });
  }
}