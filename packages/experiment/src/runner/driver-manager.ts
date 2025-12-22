/**
 * Driver manager for caching and cleanup
 */

import type { AIService, ModelSpec } from '@moduler-prompt/driver';

export class DriverManager {
  private cache = new Map<string, any>();

  /**
   * Get or create driver for a model
   *
   * Drivers are cached by model name.
   * Reuses existing driver if available.
   *
   * @param aiService - AIService instance
   * @param model - Model spec
   * @returns Driver instance
   */
  async getOrCreate(aiService: AIService, model: ModelSpec): Promise<any> {
    const key = model.name;

    if (this.cache.has(key)) {
      console.log(`   Using cached driver for ${key}`);
      return this.cache.get(key);
    }

    console.log(`   Creating new driver for ${key} (${model.provider}:${model.model})`);
    const driver = await aiService.createDriver(model);
    this.cache.set(key, driver);
    return driver;
  }

  /**
   * Close and remove a specific driver from cache
   *
   * @param modelName - Model name to close
   */
  async close(modelName: string): Promise<void> {
    const driver = this.cache.get(modelName);

    if (!driver) {
      return;
    }

    try {
      if (typeof driver.close === 'function') {
        await driver.close();
        console.log(`   ✅ Closed driver: ${modelName}`);
      }
      this.cache.delete(modelName);
    } catch (error) {
      console.log(`   ⚠️  Failed to close driver ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close all cached drivers
   */
  async cleanup(): Promise<void> {
    console.log();
    console.log('🧹 Cleaning up...');

    for (const [key, driver] of this.cache.entries()) {
      try {
        if (driver && typeof driver.close === 'function') {
          await driver.close();
          console.log(`   Closed driver: ${key}`);
        }
      } catch (error) {
        console.log(`   Warning: Failed to close driver ${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('✅ Cleanup completed');
  }
}
