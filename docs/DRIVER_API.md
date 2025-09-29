# Driver APIリファレンス

`@moduler-prompt/driver`パッケージのAPIリファレンス。

## 目次

- [インターフェース](#インターフェース)
- [基底クラス](#基底クラス)
- [ドライバー実装](#ドライバー実装)
- [型定義](#型定義)
- [ユーティリティ](#ユーティリティ)
- [Structured Outputs](./STRUCTURED_OUTPUTS.md) - 構造化出力の詳細仕様

## インターフェース

### AIDriver

すべてのドライバーが実装すべき基本インターフェース。

```typescript
interface AIDriver {
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult>;
  close(): Promise<void>;
}
```

#### メソッド

##### query()

コンパイル済みプロンプトでAIモデルにクエリを送信。

```typescript
query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>
```

**パラメータ：**
- `prompt`：コンパイル済みのプロンプトモジュール
- `options`：クエリオプション（温度、最大トークン数など）

**戻り値：**
- `QueryResult`：レスポンス内容と使用状況

##### streamQuery()

ストリーミングレスポンスを生成。

```typescript
streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult>
```

**パラメータ：**
- `prompt`：コンパイル済みのプロンプトモジュール
- `options`：クエリオプション

**戻り値：**
- `StreamResult`：ストリームと最終結果を含むオブジェクト

##### close()

ドライバーのリソースをクリーンアップ。

```typescript
close(): Promise<void>
```

## ドライバー実装の注意点

各ドライバーは`AIDriver`インターフェースを直接実装します。PR #14以降、`BaseDriver`は廃止され、各ドライバーが独立してプロンプト処理を行います。

### 実装ガイドライン

1. **プロンプト処理**: 各ドライバーが`CompiledPrompt`を適切な形式に変換
2. **ストリーミング**: `StreamResult`型でストリームと結果の両方を返す
3. **エラーハンドリング**: 統一された`finishReason`でエラーを表現
4. **リソース管理**: `close()`メソッドで適切にクリーンアップ

## ドライバー実装

### OpenAIDriver

OpenAI API用のドライバー。

```typescript
class OpenAIDriver implements AIDriver {
  constructor(config: OpenAIDriverConfig);
}
```

#### OpenAIDriverConfig

```typescript
interface OpenAIDriverConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  organization?: string;
  defaultOptions?: Partial<OpenAIQueryOptions>;
}
```

#### OpenAIQueryOptions

```typescript
interface OpenAIQueryOptions extends QueryOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  logprobs?: boolean;
  topLogprobs?: number;
  responseFormat?: { type: 'json_object' | 'text' };
  seed?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}
```

### AnthropicDriver

Anthropic Claude API用のドライバー。

```typescript
class AnthropicDriver implements AIDriver {
  constructor(config: AnthropicDriverConfig);
}
```

#### AnthropicDriverConfig

```typescript
interface AnthropicDriverConfig {
  apiKey?: string;
  model?: string;
  defaultOptions?: Partial<AnthropicQueryOptions>;
}
```

#### AnthropicQueryOptions

```typescript
interface AnthropicQueryOptions extends QueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}
```

### VertexAIDriver

Google Cloud Vertex AI用のドライバー。

```typescript
class VertexAIDriver implements AIDriver {
  constructor(config: VertexAIDriverConfig);
}
```

#### VertexAIDriverConfig

```typescript
interface VertexAIDriverConfig {
  project?: string;
  location?: string;
  model?: string;
  temperature?: number;
  defaultOptions?: Partial<VertexAIQueryOptions>;
}
```

#### VertexAIQueryOptions

```typescript
interface VertexAIQueryOptions extends QueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  responseFormat?: 'json' | 'text';
  jsonSchema?: any;
}
```

### OllamaDriver

Ollamaローカルモデル用のドライバー（OpenAI互換）。

```typescript
class OllamaDriver extends OpenAIDriver {
  constructor(config: OllamaDriverConfig);
}
```

#### OllamaDriverConfig

```typescript
interface OllamaDriverConfig extends Omit<OpenAIDriverConfig, 'apiKey' | 'organization'> {
  baseURL?: string;
  model?: string;
}
```

### MlxDriver

MLX ML用のドライバー（Pythonサブプロセス）。

```typescript
class MlxDriver implements AIDriver {
  constructor(config: MlxDriverConfig);
}
```

#### MlxDriverConfig

```typescript
interface MlxDriverConfig {
  model: string;
  defaultOptions?: Partial<MlxMlModelOptions>;
}
```

#### MlxMlModelOptions

```typescript
interface MlxMlModelOptions {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
  repetition_context_size?: number;
}
```

### TestDriver

テストとデバッグ用のモックドライバー。v0.2.1よりstructured outputs対応。

```typescript
class TestDriver implements AIDriver {
  constructor(options?: TestDriverOptions);
}
```

#### TestDriverOptions

```typescript
interface TestDriverOptions {
  responses?: string[] | ResponseProvider;
  delay?: number;
}
```

#### ResponseProvider

```typescript
type ResponseProvider = (
  prompt: CompiledPrompt,
  options?: QueryOptions
) => string | Promise<string>;
```

#### 特徴

- **Structured Outputs対応** (v0.2.1以降): `outputSchema`が指定された場合、レスポンスからJSONを自動抽出
- **レスポンスプロバイダー**: 動的なレスポンス生成が可能
- **遅延シミュレーション**: API呼び出しの遅延を模擬
- **使用状況シミュレーション**: トークン使用量を推定

詳細な使用例は[TEST_DRIVERS.md](./TEST_DRIVERS.md)を参照。

### EchoDriver

プロンプトをエコーバックするデバッグ用ドライバー。v0.2.1よりstructured outputs対応。

```typescript
class EchoDriver implements AIDriver {
  constructor(config?: EchoDriverConfig);
}
```

#### EchoDriverConfig

```typescript
interface EchoDriverConfig {
  format?: 'text' | 'messages' | 'raw' | 'both' | 'debug';
  includeMetadata?: boolean;
  formatterOptions?: FormatterOptions;
  simulateUsage?: boolean;
  streamChunkSize?: number;
}
```

#### 特徴

- **複数の出力形式**: テキスト、メッセージ、生データ、両方、デバッグ情報
- **Structured Outputs対応** (v0.2.1以降): JSON形式（raw、messages、both、debug）の場合に自動的にstructuredOutputを生成
- **メタデータ付加**: リクエストのメタデータを含めることが可能
- **カスタムフォーマッターオプション**: 出力形式のカスタマイズ
- **ストリーミングサポート**: チャンクサイズを指定可能

詳細な使用例は[TEST_DRIVERS.md](./TEST_DRIVERS.md)を参照。

## 型定義

### ChatMessage

チャットメッセージの形式。

```typescript
interface ChatMessage {
  role: Role;
  content: string;
}
```

### Role

メッセージのロール。

```typescript
type Role = 'system' | 'assistant' | 'user';
```

### QueryOptions

基本的なクエリオプション。

```typescript
interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}
```

### QueryResult

クエリの結果。

```typescript
interface QueryResult {
  content: string;
  structuredOutput?: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}
```

### StreamResult

ストリーミングクエリの結果。

```typescript
interface StreamResult {
  /**
   * Async iterable stream of response chunks
   */
  stream: AsyncIterable<string>;

  /**
   * Promise that resolves to the final query result
   */
  result: Promise<QueryResult>;
}
```

### ModelSpec

モデル仕様の定義。

```typescript
interface ModelSpec {
  /** モデル識別子 */
  model: string;

  /** プロバイダー名 */
  provider: DriverProvider;

  /** モデルの能力 */
  capabilities: DriverCapability[];

  /** 最大入力トークン数 */
  maxInputTokens?: number;

  /** 最大出力トークン数 */
  maxOutputTokens?: number;

  /** 優先度（高いほど優先） */
  priority?: number;

  /** コスト情報 */
  cost?: {
    input: number;   // 1Kトークンあたりのコスト（ドル）
    output: number;
  };

  /** 有効/無効フラグ */
  enabled?: boolean;
}
```

### DriverCapability

ドライバーの能力を表すフラグ。

```typescript
type DriverCapability =
  | 'streaming'      // ストリーミング応答
  | 'local'          // ローカル実行
  | 'fast'           // 高速応答
  | 'large-context'  // 大規模コンテキスト
  | 'multilingual'   // 多言語対応
  | 'japanese'       // 日本語特化
  | 'coding'         // コーディング特化
  | 'reasoning'      // 推論・思考特化
  | 'chat'           // チャット特化
  | 'tools'          // ツール使用
  | 'vision'         // 画像認識
  | 'audio'          // 音声処理
  | 'structured'     // 構造化出力
  | 'json'           // JSON出力
  | 'function-calling'; // 関数呼び出し
```

### DriverProvider

利用可能なプロバイダー。

```typescript
type DriverProvider =
  | 'openai'
  | 'anthropic'
  | 'vertexai'
  | 'mlx'
  | 'ollama'
  | 'echo'   // テスト用
  | 'test';  // ユニットテスト用
```

## ユーティリティ

### フォーマッター統合

各ドライバーは必要に応じて`@moduler-prompt/driver`のフォーマッターを使用できます。

```typescript
import { formatPrompt, formatPromptAsMessages } from '../formatter/index.js';

// ドライバー実装での使用例
async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
  // メッセージ形式が必要な場合
  const messages = formatPromptAsMessages(prompt, this.formatterOptions);
  // または、テキスト形式が必要な場合
  const text = formatPrompt(prompt, this.formatterOptions);

  // APIに応じて適切な形式を使用
  const response = await this.callAPI(messages);
  // ...
}
```

### エラーハンドリング

すべてのドライバーは統一されたエラーハンドリングを実装：

```typescript
try {
  // API呼び出し
  const response = await apiCall();
  return {
    content: response.text,
    finishReason: 'stop'
  };
} catch (error) {
  return {
    content: '',
    finishReason: 'error'
  };
}
```

## 使用例

### 基本的な使用

```typescript
import { compile } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver';

const driver = new OpenAIDriver({
  apiKey: 'sk-...',
  model: 'gpt-4o-mini'
});

const prompt = compile(myModule, context);
const result = await driver.query(prompt, {
  temperature: 0.7,
  maxTokens: 1000
});

console.log(result.content);
```

### ストリーミング

```typescript
const { stream, result } = await driver.streamQuery(prompt);

// ストリームをリアルタイムで処理
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 最終結果を取得
const finalResult = await result;
console.log('\nTotal tokens:', finalResult.usage?.totalTokens);
```

### カスタムドライバーの実装

```typescript
import type { AIDriver, QueryResult, StreamResult } from '@moduler-prompt/driver';
import { formatPromptAsMessages } from '@moduler-prompt/driver';

export class CustomDriver implements AIDriver {
  private client: CustomAPIClient;

  constructor(config: CustomConfig) {
    this.client = new CustomAPIClient(config.apiKey);
  }

  async query(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): Promise<QueryResult> {
    // プロンプトをAPI形式に変換
    const messages = formatPromptAsMessages(prompt);

    const response = await this.client.chat({
      messages,
      ...options
    });

    return {
      content: response.text,
      finishReason: this.mapFinishReason(response.finishReason),
      usage: {
        promptTokens: response.usage.input,
        completionTokens: response.usage.output,
        totalTokens: response.usage.total
      }
    };
  }

  async streamQuery(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): Promise<StreamResult> {
    const messages = formatPromptAsMessages(prompt);

    // ストリーミング用のイテレータを作成
    async function* streamGenerator(): AsyncIterable<string> {
      const stream = await this.client.streamChat({ messages, ...options });
      for await (const chunk of stream) {
        yield chunk.text;
      }
    }

    // 結果のPromiseを作成
    const resultPromise = this.query(prompt, options);

    return {
      stream: streamGenerator(),
      result: resultPromise
    };
  }

  private mapFinishReason(reason: string): QueryResult['finishReason'] {
    switch (reason) {
      case 'complete': return 'stop';
      case 'max_length': return 'length';
      default: return 'error';
    }
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }
}
```

### AIServiceを使ったドライバー管理

#### 基本的な使用方法

```typescript
import { AIService } from '@moduler-prompt/driver';
import type { ModelSpec } from '@moduler-prompt/driver';

// AIサービスの初期化
const aiService = new AIService({
  models: [
    {
      model: 'gpt-4o-mini',
      provider: 'openai',
      capabilities: ['streaming', 'tools', 'reasoning'],
      maxInputTokens: 128000,
      priority: 10
    },
    {
      model: 'claude-3-haiku',
      provider: 'anthropic',
      capabilities: ['streaming', 'fast', 'large-context'],
      maxInputTokens: 200000,
      priority: 20
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
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    mlx: { /* MLXは設定不要 */ }
  },
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 2000
  }
});
```

#### ケイパビリティベースのドライバー選択

```typescript
// ストリーミング対応の高速ドライバーを選択
const driver = await aiService.createDriverFromCapabilities(
  ['streaming', 'fast'],  // 必須ケイパビリティ
  {
    preferLocal: true,     // ローカル実行を優先
    excludeProviders: ['vertexai']  // 特定プロバイダーを除外
  }
);

if (driver) {
  const result = await driver.query(prompt);
  console.log(result.content);
}
```

#### 特定モデルの直接指定

```typescript
// 特定モデルを直接指定してドライバー作成
const driver = await aiService.createDriver('gpt-4o-mini');

// またはプロバイダーとモデルを指定
const driver2 = await aiService.createDriverByProvider(
  'anthropic',
  'claude-3-haiku'
);
```

#### モデル選択の詳細制御

```typescript
// 詳細な選択条件を指定
const models = aiService.selectModels(
  ['streaming'],           // 必須ケイパビリティ
  {
    preferredCapabilities: ['japanese', 'fast'],  // 望ましいケイパビリティ
    minInputTokens: 100000,                      // 最小入力トークン数
    maxCost: { input: 0.001, output: 0.002 },    // コスト上限
    providers: ['openai', 'anthropic']           // プロバイダーを限定
  }
);

// 最適なモデルでドライバーを作成
if (models.length > 0) {
  const driver = await aiService.registry.createDriver(models[0]);
}
```

## 注意事項

1. **APIキーのセキュリティ**: APIキーは環境変数で管理し、コードにハードコードしない
2. **レート制限**: 各プロバイダーのレート制限を確認し、適切に処理する
3. **コスト管理**: `usage`フィールドを監視してAPIコストを追跡
4. **エラー処理**: `finishReason`を確認して適切にエラーを処理
5. **リソース管理**: MLXドライバーなど、明示的なクリーンアップが必要なドライバーは`close()`を呼び出す