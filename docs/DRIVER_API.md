# Driver API リファレンス

`@moduler-prompt/driver`パッケージの完全なAPIリファレンス。

## 目次

- [インターフェース](#インターフェース)
- [基底クラス](#基底クラス)
- [ドライバー実装](#ドライバー実装)
- [型定義](#型定義)
- [ユーティリティ](#ユーティリティ)

## インターフェース

### AIDriver

全てのドライバーが実装すべき基本インターフェース。

```typescript
interface AIDriver {
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  streamQuery?(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>;
  getFormatterOptions(): FormatterOptions;
  preferMessageFormat?: boolean;
  close?(): Promise<void>;
}
```

#### プロパティ

| プロパティ | 型 | 説明 |
|---------|---|------|
| `preferMessageFormat` | `boolean` | メッセージ形式を優先するか（デフォルト: false） |

#### メソッド

##### query()

コンパイル済みプロンプトでAIモデルにクエリを送信。

```typescript
query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>
```

**パラメータ:**
- `prompt`: コンパイル済みのプロンプトモジュール
- `options`: クエリオプション（温度、最大トークン数など）

**戻り値:**
- `QueryResult`: レスポンス内容と使用状況

##### streamQuery()

ストリーミングレスポンスを生成。

```typescript
streamQuery(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>
```

**パラメータ:**
- `prompt`: コンパイル済みのプロンプトモジュール
- `options`: クエリオプション

**戻り値:**
- `AsyncIterable<string>`: レスポンスのチャンク

##### getFormatterOptions()

現在のフォーマッターオプションを取得。

```typescript
getFormatterOptions(): FormatterOptions
```

**戻り値:**
- `FormatterOptions`: フォーマッター設定

##### close()

ドライバーのリソースをクリーンアップ。

```typescript
close(): Promise<void>
```

## 基底クラス

### BaseDriver

全てのドライバー実装の基底クラス。

```typescript
abstract class BaseDriver implements AIDriver {
  protected formatterOptions: FormatterOptions;
  public preferMessageFormat: boolean = false;
  
  constructor(formatterOptions?: FormatterOptions);
  
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  async *streamQuery(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>;
  getFormatterOptions(): FormatterOptions;
  
  protected async queryWithMessages(messages: ChatMessage[], options?: QueryOptions): Promise<QueryResult>;
  protected async queryWithText(text: string, options?: QueryOptions): Promise<QueryResult>;
  async close(): Promise<void>;
}
```

#### コンストラクタ

```typescript
constructor(formatterOptions: FormatterOptions = {})
```

**パラメータ:**
- `formatterOptions`: プロンプトフォーマッティングオプション

#### 保護メソッド

##### queryWithMessages()

メッセージ配列でクエリを実行（メッセージベースAPI用）。

```typescript
protected async queryWithMessages(
  messages: ChatMessage[], 
  options?: QueryOptions
): Promise<QueryResult>
```

##### queryWithText()

テキスト文字列でクエリを実行（テキストベースAPI用）。

```typescript
protected async queryWithText(
  text: string, 
  options?: QueryOptions
): Promise<QueryResult>
```

## ドライバー実装

### OpenAIDriver

OpenAI API用のドライバー。

```typescript
class OpenAIDriver extends BaseDriver {
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
class AnthropicDriver extends BaseDriver {
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
class VertexAIDriver extends BaseDriver {
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
class MlxDriver extends BaseDriver {
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

テストとデバッグ用のモックドライバー。

```typescript
class TestDriver extends BaseDriver {
  constructor(options?: TestDriverOptions);
}
```

#### TestDriverOptions

```typescript
interface TestDriverOptions {
  responses?: string[];
  responseProvider?: ResponseProvider;
  responseDelay?: number;
  streamChunkDelay?: number;
  errorOnQuery?: number;
  simulateUsage?: boolean;
}
```

#### ResponseProvider

```typescript
type ResponseProvider = (
  prompt: CompiledPrompt, 
  options?: QueryOptions
) => string | Promise<string>;
```

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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
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

ドライバーは`@moduler-prompt/utils`のフォーマッターと統合されています。

```typescript
import { formatPrompt, formatPromptAsMessages } from '@moduler-prompt/utils';

// BaseDriverクラス内部での使用
async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
  if (this.preferMessageFormat) {
    const messages = formatPromptAsMessages(prompt, this.getFormatterOptions());
    return this.queryWithMessages(messages, options);
  } else {
    const text = formatPrompt(prompt, this.getFormatterOptions());
    return this.queryWithText(text, options);
  }
}
```

### エラーハンドリング

全てのドライバーは統一されたエラーハンドリングを実装：

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
for await (const chunk of driver.streamQuery(prompt)) {
  process.stdout.write(chunk);
}
```

### カスタムドライバーの実装

```typescript
import { BaseDriver } from '@moduler-prompt/driver';

export class CustomDriver extends BaseDriver {
  private client: CustomAPIClient;
  
  constructor(config: CustomConfig) {
    super(config.formatterOptions);
    this.client = new CustomAPIClient(config.apiKey);
    this.preferMessageFormat = true;
  }
  
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options?: QueryOptions
  ): Promise<QueryResult> {
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