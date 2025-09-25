# プロンプトモジュールの使い方

## 概要

作成したプロンプトモジュールを実際に使用する方法について解説する。

## 基本的な使用フロー

```typescript
import { compile, createContext, merge } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver';

// 1. モジュールを準備（作成済みまたはインポート）
const myModule = { /* ... */ };

// 2. コンテキストを生成
const context = createContext(myModule);

// 3. データを設定
context.items = ['item1', 'item2'];
context.currentState = 'processing';

// 4. コンパイル
const compiled = compile(myModule, context);

// 5. AIドライバーで実行
const driver = new OpenAIDriver({ apiKey: 'sk-...' });
const result = await driver.query(compiled);
```

## コンテキストの管理

### createContext関数

モジュールから型安全なコンテキストを生成：

```typescript
const context = createContext(myModule);
// context は myModule.createContext() の戻り値型を持つ
```

### データの設定

生成されたコンテキストにアプリケーションデータを設定：

```typescript
// ユーザー入力の設定
context.userInput = await getUserInput();

// 外部データの設定
context.materials = await fetchExternalData();

// 状態の更新
context.state = 'ready';
```

## コンパイル処理

### compile関数

モジュールとコンテキストから構造化プロンプトを生成：

```typescript
const compiled = compile(myModule, context);
// compiled: { instructions: Element[], data: Element[], output: Element[] }
```

### コンパイル時の処理

1. 動的関数の実行
2. 標準セクションの変換
3. 要素の配置と整理
4. 3つの大セクションへの分類

## AIドライバーでの実行

### 基本的な実行

```typescript
const driver = new OpenAIDriver({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini'
});

const result = await driver.query(compiled, {
  temperature: 0.7,
  maxTokens: 1000
});

console.log(result.content);
```

### ストリーミング実行

```typescript
// ストリーミング対応
const { stream, result } = await driver.streamQuery(compiled);

// ストリームをリアルタイムで処理
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 最終結果を取得
const finalResult = await result;
console.log('\nTotal tokens:', finalResult.usage?.totalTokens);
```

### AIサービスを使った動的ドライバー選択

```typescript
import { AIService } from '@moduler-prompt/driver';

// AIサービスを設定
const aiService = new AIService({
  models: [
    {
      model: 'gpt-4o-mini',
      provider: 'openai',
      capabilities: ['streaming', 'tools', 'reasoning'],
      priority: 10
    },
    {
      model: 'llama-3.3-70b',
      provider: 'mlx',
      capabilities: ['local', 'fast', 'japanese'],
      priority: 30
    }
  ],
  drivers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    mlx: {} // MLXは設定不要
  }
});

// タスクに応じて最適なドライバーを選択
const driver = await aiService.createDriverFromCapabilities(
  ['japanese', 'fast'],
  { preferLocal: true }  // ローカル優先
);

if (driver) {
  const result = await driver.query(compiled);
  console.log(result.content);
}
```

## 実践的な使用例

### チャットアプリケーション

```typescript
import { merge, compile, createContext } from '@moduler-prompt/core';
import { withMaterials } from '@moduler-prompt/process';
import { MlxDriver } from '@moduler-prompt/driver';

// ベースモジュールと資料管理モジュールを合成
const chatModule = merge(baseChatModule, withMaterials);

// コンテキストの準備
const context = createContext(chatModule);
context.messages = conversationHistory;
context.materials = relevantDocuments;

// コンパイルと実行
const compiled = compile(chatModule, context);
const driver = new MlxDriver({ model: 'mlx-community/gemma-2b' });
const response = await driver.query(compiled);
```

### バッチ処理

```typescript
// 複数のデータを順次処理
for (const item of dataItems) {
  const context = createContext(processModule);
  context.currentItem = item;
  
  const compiled = compile(processModule, context);
  const result = await driver.query(compiled);
  
  results.push(result);
}
```

### エラーハンドリング

```typescript
try {
  const compiled = compile(module, context);
  const result = await driver.query(compiled);
  
  if (result.finishReason === 'error') {
    console.error('AI処理エラー');
  }
} catch (error) {
  console.error('コンパイルエラー:', error);
}
```

## ドライバーの選択

### 利用可能なドライバー

| ドライバー | 用途 |
|----------|------|
| OpenAIDriver | GPT-4, GPT-3.5 |
| AnthropicDriver | Claude |
| VertexAIDriver | Google Gemini |
| OllamaDriver | ローカルLLM |
| MlxDriver | Apple Silicon最適化 |
| TestDriver | テスト用モック |

### ドライバーの設定

```typescript
// OpenAI
const openai = new OpenAIDriver({
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  defaultOptions: {
    temperature: 0.7
  }
});

// Anthropic
const claude = new AnthropicDriver({
  apiKey: 'sk-ant-...',
  model: 'claude-3-5-sonnet-20241022'
});

// ローカルモデル
const local = new OllamaDriver({
  baseURL: 'http://localhost:11434',
  model: 'llama3.2'
});
```

## パフォーマンス最適化

### コンテキストの再利用

```typescript
// コンテキストを一度作成して複数回使用
const context = createContext(module);

for (const query of queries) {
  context.currentQuery = query;
  const compiled = compile(module, context);
  // ...
}
```

### ストリーム処理

大量のデータを処理する場合：

```typescript
import { streamProcess } from '@moduler-prompt/process';

const processor = streamProcess(module);
const results = await processor.execute(largeDataset);
```

## デバッグとテスト

### TestDriverの使用

```typescript
import { TestDriver } from '@moduler-prompt/driver';

const testDriver = new TestDriver({
  responses: ['テスト応答1', 'テスト応答2'],
  simulateUsage: true
});

// テスト実行
const result = await testDriver.query(compiled);
assert(result.content === 'テスト応答1');
```

### プロンプトの確認

```typescript
import { formatPrompt } from '@moduler-prompt/utils';

const compiled = compile(module, context);
const promptText = formatPrompt(compiled);

console.log('生成されたプロンプト:');
console.log(promptText);
```

## 高度な使用方法

### DriverRegistryによる自動選択

```typescript
import { DriverRegistry } from '@moduler-prompt/driver';

const registry = new DriverRegistry();

// モデルを登録
registry.registerModel({
  model: 'gpt-4o-mini',
  provider: 'openai',
  capabilities: ['japanese', 'streaming'],
  priority: 10
});

// 条件に基づいて最適なドライバーを選択
const driver = await registry.selectAndCreateDriver(
  ['japanese', 'streaming'],
  { preferLocal: true }
);
```

### カスタムフォーマッター

```typescript
const driver = new OpenAIDriver({
  apiKey: 'sk-...',
  formatterOptions: {
    sectionSeparator: '\n===\n',
    includeSectionTitles: false
  }
});
```

## トラブルシューティング

### よくある問題

1. **コンテキストの型エラー**
   - createContext()を使用して正しい型のコンテキストを生成
   - TypeScriptの型チェックを活用

2. **コンパイルエラー**
   - DynamicContentの戻り値を確認
   - null/undefinedの処理を適切に行う

3. **APIエラー**
   - APIキーの設定を確認
   - レート制限に注意
   - ネットワーク接続を確認

## まとめ

プロンプトモジュールの使用は以下の流れで行う：

1. モジュールの準備
2. コンテキストの生成とデータ設定
3. コンパイル
4. AIドライバーでの実行

この基本フローを理解すれば、様々なユースケースに対応できる。