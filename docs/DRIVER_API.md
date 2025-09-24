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
- **Structured Outputs対応** (v0.2.1以降): JSON形式（raw、messages、both、debug）の場合に自動的にstructuredOutputsを生成
- **メタデータ付加**: リクエストのメタデータを含めることが可能
- **カスタムフォーマッターオプション**: 出力形式のカスタマイズ
- **ストリーミングサポート**: チャンクサイズを指定可能

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
  structuredOutputs?: unknown[];
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

### DriverConfig

ドライバー設定の基本型。

```typescript
interface DriverConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'test';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  defaultOptions?: QueryOptions;
}
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

### プロバイダー切り替え

```typescript
function createDriver(provider: string, config: any): AIDriver {
  switch (provider) {
    case 'openai':
      return new OpenAIDriver(config);
    case 'anthropic':
      return new AnthropicDriver(config);
    case 'vertexai':
      return new VertexAIDriver(config);
    case 'ollama':
      return new OllamaDriver(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// 環境変数で制御
const driver = createDriver(
  process.env.AI_PROVIDER || 'openai',
  {
    apiKey: process.env.API_KEY,
    model: process.env.MODEL
  }
);
```

## 注意事項

1. **APIキーのセキュリティ**: APIキーは環境変数で管理し、コードにハードコードしない
2. **レート制限**: 各プロバイダーのレート制限を確認し、適切に処理する
3. **コスト管理**: `usage`フィールドを監視してAPIコストを追跡
4. **エラー処理**: `finishReason`を確認して適切にエラーを処理
5. **リソース管理**: MLXドライバーなど、明示的なクリーンアップが必要なドライバーは`close()`を呼び出す