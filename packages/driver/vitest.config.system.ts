import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // システムテスト用の設定
    include: [
      '**/test/system/**/*.test.ts'
    ],
    // システムテストは時間がかかるため長めのタイムアウト
    testTimeout: 60000,     // 60秒
    hookTimeout: 60000,
  }
});