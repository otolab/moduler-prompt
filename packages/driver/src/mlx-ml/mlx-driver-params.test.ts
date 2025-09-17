/**
 * MLX Driver パラメータ統合テスト
 * 
 * 実際のMLXプロセスとの通信をテストして、
 * temperatureなどのパラメータが正しく処理されることを確認
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MlxDriver } from './mlx-driver.js';
import type { ChatMessage } from '@moduler-prompt/core';

describe('MLX Driver Parameters Integration', () => {
  let driver: MlxDriver | null = null;

  beforeAll(async () => {
    // 小さなテスト用モデルを使用
    driver = new MlxDriver('mlx-community/gemma-3-270m-it-qat-4bit');
  });

  afterAll(async () => {
    if (driver) {
      await driver.cleanup();
    }
  });

  it('should accept temperature parameter without error', async () => {
    if (!driver) {
      throw new Error('Driver not initialized');
    }

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Say exactly: TEST' }
    ];

    // temperatureパラメータを渡してエラーが出ないことを確認
    const result = await driver.queryWithMessages(messages, {
      maxTokens: 5,
      temperature: 0.1  // 低い温度で決定的な出力に近づける
    });

    // エラーなく結果が返ることを確認
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
  });

  it('should accept multiple parameters without error', async () => {
    if (!driver) {
      throw new Error('Driver not initialized');
    }

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hi' }
    ];

    // 複数のパラメータを同時に渡す
    const result = await driver.queryWithMessages(messages, {
      maxTokens: 10,
      temperature: 0.5,
      topP: 0.9
    });

    // エラーなく結果が返ることを確認
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should work with completion API and temperature', async () => {
    if (!driver) {
      throw new Error('Driver not initialized');
    }

    // completion APIでもtemperatureが動作することを確認
    const result = await driver.queryWithCompletion('Complete this: Hello', {
      maxTokens: 5,
      temperature: 0.3
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle temperature=0 (deterministic)', async () => {
    if (!driver) {
      throw new Error('Driver not initialized');
    }

    const messages: ChatMessage[] = [
      { role: 'user', content: '1+1=' }
    ];

    // temperature=0で決定的な出力
    const result = await driver.queryWithMessages(messages, {
      maxTokens: 3,
      temperature: 0
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});
