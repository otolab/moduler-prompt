# @moduler-prompt/utils

Moduler Promptフレームワークのユーティリティパッケージ。プロンプトのフォーマット変換とドライバレジストリ機能を提供します。

## 機能

### 1. プロンプトフォーマッタ

CompiledPromptをテキストやメッセージ配列に変換：

```typescript
import { formatPrompt, formatPromptAsMessages } from '@moduler-prompt/utils';
import { compile } from '@moduler-prompt/core';

const compiled = compile(module, context);

// テキスト形式に変換
const text = formatPrompt(compiled);

// メッセージ配列形式に変換（ChatGPT API用）
const messages = formatPromptAsMessages(compiled);
```

### 2. ドライバレジストリ

AIモデルドライバの自動選択と管理：

```typescript
import { DriverRegistry, registerDriverFactories } from '@moduler-prompt/utils';
import * as Drivers from '@moduler-prompt/driver';

// レジストリを初期化
const registry = new DriverRegistry();

// ドライバファクトリを登録
registerDriverFactories(registry, Drivers);

// 設定ファイルを読み込み
// (サンプル設定: docs/examples/driver-registry-config.yaml)
await registry.loadConfig('./drivers.yaml');

// 必要な能力に基づいてドライバを自動選択
const driver = await registry.selectAndCreateDriver(
  ['japanese', 'chat', 'local'],
  {
    preferLocal: true,
    preferFast: true
  }
);

// 選択されたドライバで実行
const result = await driver.query(compiledPrompt);
```

## Driver Registry

### 設定ファイル形式（YAML）

サンプル設定ファイルは `docs/examples/driver-registry-config.yaml` を参照してください。

```yaml
version: "1.0"
defaultDriver: mlx-gemma-270m

global:
  temperature: 0.7
  maxTokens: 2048
  timeout: 30000

drivers:
  - id: mlx-gemma-270m
    name: MLX Gemma 270M
    model:
      model: mlx-community/gemma-3-270m-it-qat-4bit
      provider: mlx
      capabilities:
        - local
        - fast
        - streaming
        - japanese
        - chat
      maxInputTokens: 8192
      maxOutputTokens: 2048
      priority: 10
    
  - id: gpt-4o
    name: GPT-4o
    model:
      model: gpt-4o
      provider: openai
      capabilities:
        - streaming
        - tools
        - vision
        - multilingual
        - reasoning
        - large-context
      maxInputTokens: 128000
      maxOutputTokens: 16384
      cost:
        input: 0.0025
        output: 0.01
      priority: 20
```

### ドライバ能力（Capabilities）

- `streaming`: ストリーミング応答対応
- `local`: ローカル実行可能
- `fast`: 高速応答
- `large-context`: 大規模コンテキスト対応
- `multilingual`: 多言語対応
- `japanese`: 日本語特化
- `coding`: コーディング特化
- `reasoning`: 推論・思考特化
- `chat`: チャット特化
- `tools`: ツール使用可能
- `vision`: 画像認識可能
- `audio`: 音声処理可能
- `structured`: 構造化出力対応
- `json`: JSON出力対応
- `function-calling`: 関数呼び出し対応

### 選択条件の指定

```typescript
import type { DriverSelectionCriteria } from '@moduler-prompt/utils';

const criteria: DriverSelectionCriteria = {
  // 必須の能力（すべて満たす必要がある）
  requiredCapabilities: ['japanese', 'streaming'],
  
  // 望ましい能力（いくつか満たせばよい）
  preferredCapabilities: ['local', 'fast'],
  
  // 除外する能力
  excludeCapabilities: ['tools'],
  
  // 最小トークン数
  minInputTokens: 8000,
  minOutputTokens: 2000,
  
  // 最大コスト（1Kトークンあたり）
  maxCost: {
    input: 0.001,
    output: 0.005
  },
  
  // プロバイダー制限
  providers: ['mlx', 'openai'],
  excludeProviders: ['anthropic'],
  
  // 優先設定
  preferLocal: true,
  preferFast: true
};

const result = registry.selectDriver(criteria);
if (result) {
  console.log(`Selected: ${result.driver.name}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Score: ${result.score}`);
}
```

### プログラマティックな登録

```typescript
// カスタムドライバ設定を登録
registry.registerDriver({
  id: 'custom-model',
  name: 'Custom Model',
  model: {
    model: 'my-custom-model',
    provider: 'mlx',
    capabilities: ['local', 'japanese', 'chat'],
    maxInputTokens: 4096,
    maxOutputTokens: 1024,
    priority: 5
  },
  options: {
    temperature: 0.8
  }
});
```

### 使用例

```typescript
import { DriverRegistry, registerDriverFactories, formatPrompt } from '@moduler-prompt/utils';
import * as Drivers from '@moduler-prompt/driver';
import { compile, createContext } from '@moduler-prompt/core';
import { chatPromptModule } from '@moduler-prompt/simple-chat';

async function main() {
  // レジストリを設定
  const registry = new DriverRegistry();
  registerDriverFactories(registry, Drivers);
  await registry.loadConfig('./drivers.yaml');
  
  // コンテキストとプロンプトを準備
  const context = createContext(chatPromptModule);
  context.userMessage = 'こんにちは！';
  const compiled = compile(chatPromptModule, context);
  
  // 日本語対応のローカルドライバを自動選択
  const driver = await registry.selectAndCreateDriver(
    ['japanese', 'chat'],
    { preferLocal: true }
  );
  
  if (!driver) {
    console.error('No suitable driver found');
    return;
  }
  
  // AIに問い合わせ
  const response = await driver.query(compiled);
  console.log(response.content);
}

main().catch(console.error);
```

## インストール

```bash
npm install @moduler-prompt/utils
```

## API リファレンス

### DriverRegistry

- `loadConfig(path: string)`: YAML設定ファイルを読み込み
- `registerDriver(config: DriverConfig)`: ドライバを登録
- `registerFactory(provider: DriverProvider, factory: DriverFactory)`: ドライバファクトリを登録
- `selectDriver(criteria: DriverSelectionCriteria)`: 条件に基づいてドライバを選択
- `getDriver(id: string)`: IDでドライバ設定を取得
- `getAllDrivers()`: すべてのドライバ設定を取得
- `createDriver(config: DriverConfig)`: ドライバインスタンスを作成
- `selectAndCreateDriver(capabilities, options?)`: 自動選択してインスタンス作成

### Helper Functions

- `registerDriverFactories(registry: DriverRegistry, drivers: DriverClasses)`: 標準ドライバファクトリを一括登録

### Formatter

- `formatPrompt(compiled: CompiledPrompt, options?: FormatterOptions)`: テキスト形式に変換
- `formatPromptAsMessages(compiled: CompiledPrompt, options?: FormatterOptions)`: メッセージ配列に変換