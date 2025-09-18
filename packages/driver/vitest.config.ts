import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // デフォルトではシステムテストを除外
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/test/system/**/*.test.ts',  // システムテストを除外
      '**/test/e2e/**/*.test.ts'      // E2Eテストを除外
    ],
    // タイムアウト設定
    testTimeout: 10000,     // ユニットテスト: 10秒
    hookTimeout: 10000,
  }
});