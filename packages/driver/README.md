# @moduler-prompt/driver

AIモデルドライバーパッケージ - 様々なAIプロバイダーとの統一されたインターフェースを提供

## 概要

`@moduler-prompt/driver`は、OpenAI、Anthropic、Google Vertex AI、Ollama、MLX MLなど、複数のAIプロバイダーとの統合を提供するドライバーパッケージです。統一されたインターフェースにより、プロバイダーを簡単に切り替えることができます。

## インストール

```bash
npm install @moduler-prompt/driver
```

## 基本的な使い方

```typescript
import { compile } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver';

// ドライバーの初期化
const driver = new OpenAIDriver({
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini'
});

// プロンプトモジュールをコンパイル
const prompt = compile(myModule, context);

// AIモデルにクエリ
const result = await driver.query(prompt, {
  temperature: 0.7,
  maxTokens: 1000
});

console.log(result.content);
```

## 利用可能なドライバー

### OpenAI

OpenAI APIと互換性のあるサービス用のドライバー。

```typescript
import { OpenAIDriver } from '@moduler-prompt/driver';

const driver = new OpenAIDriver({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',  // デフォルト: 'gpt-4o-mini'
  baseURL: 'https://api.openai.com/v1',  // カスタムエンドポイント可
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 2000
  }
});
```

**サポートされるオプション:**
- `temperature`: 生成のランダム性 (0-2)
- `maxTokens`: 最大トークン数
- `topP`: トップPサンプリング
- `frequencyPenalty`: 頻度ペナルティ (-2.0 to 2.0)
- `presencePenalty`: 存在ペナルティ (-2.0 to 2.0)
- `stop`: 停止文字列
- `responseFormat`: レスポンス形式 (`{ type: 'json_object' | 'text' }`)
- `tools`: 関数呼び出しツール定義
- `seed`: 再現性のためのシード値

### Anthropic

Claude APIのドライバー。

```typescript
import { AnthropicDriver } from '@moduler-prompt/driver';

const driver = new AnthropicDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',  // デフォルト
  defaultOptions: {
    maxTokens: 4096,
    temperature: 0.7
  }
});
```

**サポートされるオプション:**
- `maxTokens`: 最大トークン数（必須、デフォルト: 4096）
- `temperature`: 生成のランダム性 (0-1)
- `topP`: トップPサンプリング
- `topK`: トップKサンプリング
- `stopSequences`: 停止シーケンス

### Google Vertex AI (Gemini)

Google Cloud Vertex AI経由でGeminiモデルを使用。

```typescript
import { VertexAIDriver } from '@moduler-prompt/driver';

const driver = new VertexAIDriver({
  project: 'your-gcp-project',  // または環境変数 GOOGLE_CLOUD_PROJECT
  location: 'us-central1',       // デフォルト: 'us-central1'
  model: 'gemini-2.0-flash-001', // デフォルト
  temperature: 0.05,              // デフォルト: 0.05
  defaultOptions: {
    maxTokens: 1000,
    topP: 0.95,
    topK: 40
  }
});
```

**サポートされるオプション:**
- `maxTokens`: 最大出力トークン数
- `temperature`: 生成のランダム性
- `topP`: トップPサンプリング
- `topK`: トップKサンプリング
- `responseFormat`: 'json' | 'text'
- `jsonSchema`: JSON出力のスキーマ定義

**必要な設定:**
- Google Cloud プロジェクトID（環境変数: `GOOGLE_CLOUD_PROJECT`）
- Google Cloud 認証（ADCまたはサービスアカウント）

### Ollama

ローカルで実行されるOllamaサービス用のドライバー。

```typescript
import { OllamaDriver } from '@moduler-prompt/driver';

const driver = new OllamaDriver({
  baseURL: 'http://localhost:11434/v1',  // デフォルト
  model: 'llama3.2'  // デフォルト
});
```

Ollamaドライバーは内部的にOpenAIドライバーを使用します（OllamaがOpenAI互換APIを提供するため）。

### MLX ML

Appleシリコン最適化モデル用のPythonベースのドライバー。

```typescript
import { MlxDriver } from '@moduler-prompt/driver';

const driver = new MlxDriver({
  model: 'mlx-community/gemma-3-2b',
  defaultOptions: {
    max_tokens: 500,
    temperature: 0.7,
    top_p: 0.95,
    repetition_penalty: 1.1
  }
});

// 使用後はプロセスを終了
await driver.close();
```

**サポートされるオプション:**
- `max_tokens`: 最大トークン数
- `temperature`: 生成のランダム性
- `top_p`: トップPサンプリング
- `repetition_penalty`: 繰り返しペナルティ
- `repetition_context_size`: 繰り返し検出のコンテキストサイズ

**注意事項:**
- Pythonサブプロセスを使用するため、Python環境とMLXのインストールが必要
- 使用後は必ず`close()`を呼び出してプロセスを終了

### テストドライバー

開発とテスト用のモックドライバー。

```typescript
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver({
  responses: [
    'First response',
    'Second response',
    'Third response'
  ],
  responseDelay: 100,  // ミリ秒
  streamChunkDelay: 10
});

// カスタムレスポンスプロバイダー
const driver2 = new TestDriver({
  responseProvider: async (prompt, options) => {
    // プロンプトに基づいてレスポンスを生成
    return `Response to: ${prompt.instructions[0].content}`;
  }
});
```

## ストリーミング

全てのドライバーはストリーミングレスポンスをサポートしています：

```typescript
const prompt = compile(myModule, context);

// ストリーミングレスポンス
for await (const chunk of driver.streamQuery(prompt)) {
  process.stdout.write(chunk);
}
```

## カスタムドライバーの作成

独自のドライバーを作成するには、`BaseDriver`クラスを継承します：

```typescript
import { BaseDriver } from '@moduler-prompt/driver';
import type { ChatMessage, QueryOptions, QueryResult } from '@moduler-prompt/driver';

export class CustomDriver extends BaseDriver {
  constructor(config: CustomConfig) {
    super();
    // 初期化コード
    this.preferMessageFormat = true;  // メッセージ形式を使用する場合
  }
  
  protected async queryWithMessages(
    messages: ChatMessage[], 
    options?: QueryOptions
  ): Promise<QueryResult> {
    // メッセージベースのAPI実装
    const response = await yourAPI.chat(messages);
    
    return {
      content: response.text,
      finishReason: 'stop',
      usage: {
        promptTokens: response.inputTokens,
        completionTokens: response.outputTokens,
        totalTokens: response.totalTokens
      }
    };
  }
  
  // オプション: ストリーミングの実装
  async *streamQuery(prompt: CompiledPrompt, options?: QueryOptions) {
    const stream = await yourAPI.stream(prompt);
    for await (const chunk of stream) {
      yield chunk.text;
    }
  }
  
  // オプション: クリーンアップ
  async close(): Promise<void> {
    await yourAPI.disconnect();
  }
}
```

## フォーマッター設定

ドライバーはプロンプトのフォーマット方法をカスタマイズできます：

```typescript
class CustomDriver extends BaseDriver {
  constructor() {
    super({
      preamble: 'Custom instructions for the AI',
      sectionDescriptions: {
        instructions: 'Follow these instructions carefully',
        data: 'Process this data',
        output: 'Generate output here'
      },
      lineBreak: '\n',
      formatter: new CustomFormatter()  // カスタムフォーマッター
    });
  }
}
```

## 型定義

### AIDriver インターフェース

```typescript
interface AIDriver {
  // プロンプトをクエリ
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  
  // ストリーミングクエリ
  streamQuery?(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>;
  
  // フォーマッターオプションを取得
  getFormatterOptions(): FormatterOptions;
  
  // メッセージ形式を優先するか
  preferMessageFormat?: boolean;
  
  // リソースのクリーンアップ
  close?(): Promise<void>;
}
```

### QueryResult

```typescript
interface QueryResult {
  content: string;
  finishReason?: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### QueryOptions

```typescript
interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}
```

## エラーハンドリング

全てのドライバーは統一されたエラーハンドリングを提供します：

```typescript
try {
  const result = await driver.query(prompt);
  
  if (result.finishReason === 'error') {
    console.error('Query failed');
  } else if (result.finishReason === 'length') {
    console.warn('Response was truncated due to length limit');
  }
} catch (error) {
  // ネットワークエラーや初期化エラー
  console.error('Driver error:', error);
}
```

## 環境変数

多くのドライバーは環境変数から設定を読み取ることができます：

- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Anthropic APIキー
- `GOOGLE_CLOUD_PROJECT`: Google Cloud プロジェクトID
- `GOOGLE_CLOUD_REGION`: Google Cloud リージョン
- `ANTHROPIC_VERTEX_PROJECT_ID`: Vertex AI経由でClaudeを使用する場合のプロジェクトID
- `CLOUD_ML_REGION`: Cloud ML リージョン

## ベストプラクティス

1. **APIキーの管理**: APIキーは環境変数に保存し、コードにハードコーディングしない
2. **エラーハンドリング**: `finishReason`を確認してエラーを適切に処理
3. **リソース管理**: MLXドライバーなどリソースを使用するドライバーは使用後に`close()`を呼び出す
4. **レート制限**: API制限を考慮して適切なリトライロジックを実装
5. **コスト管理**: `usage`情報を監視してAPIコストを追跡

## 例

### 複数のプロバイダーを切り替える

```typescript
import { OpenAIDriver, AnthropicDriver, VertexAIDriver } from '@moduler-prompt/driver';

function createDriver(provider: string) {
  switch (provider) {
    case 'openai':
      return new OpenAIDriver({ model: 'gpt-4o' });
    case 'anthropic':
      return new AnthropicDriver({ model: 'claude-3-5-sonnet-20241022' });
    case 'vertexai':
      return new VertexAIDriver({ model: 'gemini-2.0-flash-001' });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

const driver = createDriver(process.env.AI_PROVIDER || 'openai');
```

### ストリーミングとプログレス表示

```typescript
async function streamWithProgress(driver: AIDriver, prompt: CompiledPrompt) {
  let totalChars = 0;
  
  console.log('Generating response...');
  
  for await (const chunk of driver.streamQuery(prompt)) {
    process.stdout.write(chunk);
    totalChars += chunk.length;
    
    // プログレス情報を別の行に表示
    process.stderr.write(`\r[${totalChars} characters generated]`);
  }
  
  console.log('\nComplete!');
}
```

### リトライロジック

```typescript
async function queryWithRetry(
  driver: AIDriver, 
  prompt: CompiledPrompt,
  maxRetries = 3
): Promise<QueryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await driver.query(prompt);
      
      if (result.finishReason !== 'error') {
        return result;
      }
      
      console.warn(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Attempt ${i + 1} threw error, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。