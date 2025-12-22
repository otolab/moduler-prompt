# @modular-prompt/driver

AIモデルドライバーパッケージ - 様々なAIプロバイダーとの統一されたインターフェースを提供

## 概要

`@modular-prompt/driver`は、OpenAI、Anthropic、Google Vertex AI、Ollama、MLX MLなど、複数のAIプロバイダーとの統合を提供するドライバーパッケージです。統一されたインターフェースにより、プロバイダーを簡単に切り替えることができます。

## インストール

```bash
npm install @modular-prompt/driver
```

## 基本的な使い方

```typescript
import { compile } from '@modular-prompt/core';
import { OpenAIDriver } from '@modular-prompt/driver';

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
import { OpenAIDriver } from '@modular-prompt/driver';

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

**主なオプション:**
- `temperature`: 生成のランダム性 (0-2)
- `maxTokens`: 最大トークン数
- `topP`: トップPサンプリング

### Anthropic

Claude APIのドライバー。

```typescript
import { AnthropicDriver } from '@modular-prompt/driver';

const driver = new AnthropicDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',  // デフォルト
  defaultOptions: {
    maxTokens: 4096,
    temperature: 0.7
  }
});
```

**主なオプション:**
- `maxTokens`: 最大トークン数（デフォルト: 4096）
- `temperature`: 生成のランダム性 (0-1)
- `topP`: トップPサンプリング

### Google Vertex AI (Gemini)

Google Cloud Vertex AI経由でGeminiモデルを使用。

```typescript
import { VertexAIDriver } from '@modular-prompt/driver';

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

**主なオプション:**
- `maxTokens`: 最大出力トークン数
- `temperature`: 生成のランダム性
- `topP`: トップPサンプリング

**必要な設定:**
- Google Cloud プロジェクトID（環境変数: `GOOGLE_CLOUD_PROJECT`）
- Google Cloud 認証（ADCまたはサービスアカウント）

### Google Gen AI (Gemini)

GoogleGenAI SDKを使用してGeminiモデルに直接アクセス。APIキーのみで簡単に利用可能。

```typescript
import { GoogleGenAIDriver } from '@modular-prompt/driver';

const driver = new GoogleGenAIDriver({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  model: 'gemini-2.0-flash-exp',  // デフォルト
  temperature: 0.7,                 // デフォルト
  defaultOptions: {
    maxTokens: 2048,
    topP: 0.95,
    topK: 40
  }
});
```

**主なオプション:**
- `maxTokens`: 最大出力トークン数
- `temperature`: 生成のランダム性
- `topP`: トップPサンプリング
- `topK`: トップKサンプリング
- `thinkingConfig`: 思考レベル設定（HIGH/MEDIUM/LOW）

**必要な設定:**
- Google Gen AI APIキー（環境変数: `GOOGLE_GENAI_API_KEY`）
- APIキーは[Google AI Studio](https://aistudio.google.com/apikey)で取得可能

### Ollama

ローカルで実行されるOllamaサービス用のドライバー。

詳細なセットアップ手順とモデルのダウンロード方法については、[ローカルモデルセットアップガイド](../../docs/LOCAL_MODEL_SETUP.md#ollama)を参照してください。

```typescript
import { OllamaDriver } from '@modular-prompt/driver';

const driver = new OllamaDriver({
  baseURL: 'http://localhost:11434/v1',  // デフォルト
  model: 'llama3.2'  // デフォルト
});
```

Ollamaドライバーは内部的にOpenAIドライバーを使用します（OllamaがOpenAI互換APIを提供するため）。

### MLX ML

Appleシリコン最適化モデル用のPythonベースのドライバー。

詳細なセットアップ手順とモデルのダウンロード方法については、[ローカルモデルセットアップガイド](../../docs/LOCAL_MODEL_SETUP.md#mlx-apple-silicon)を参照してください。

#### セットアップ

MLXドライバーは初回インストール時に自動的にPython環境をセットアップします：

```bash
npm install @modular-prompt/driver
# postinstallスクリプトが自動的にPython環境をセットアップ
```

手動セットアップが必要な場合：

```bash
cd node_modules/@modular-prompt/driver
npm run setup-mlx
```

**前提条件:**
- Python 3.11以上
- Apple Silicon Mac (M1/M2/M3)
- uv（Pythonパッケージマネージャー、自動インストールされます）

#### 使用方法

```typescript
import { MlxDriver } from '@modular-prompt/driver';

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

**主なオプション:**
- `max_tokens`: 最大トークン数
- `temperature`: 生成のランダム性
- `top_p`: トップPサンプリング

**モデルのダウンロード:**

テスト用モデル（約270MB）を事前にダウンロードできます：

```bash
cd node_modules/@modular-prompt/driver
npm run download-model
```

**注意事項:**
- Pythonサブプロセスを使用するため、Python環境とMLXのインストールが必要
- 使用後は必ず`close()`を呼び出してプロセスを終了
- 初回実行時にモデルのダウンロードが発生する場合があります

#### 低レベルAPI（MlxProcess）

`MlxDriver`を経由せず、直接MLXプロセスとやり取りする低レベルAPIも公開されています。これは以下のような場合に便利です：

- `CompiledPrompt`を経由せずに、生のメッセージやプロンプトを直接送信したい
- モデル固有の処理を完全にコントロールしたい
- デバッグや検証のために低レベルAPIを使用したい

```typescript
import { MlxProcess, type MlxMessage } from '@modular-prompt/driver';

// 低レベルプロセスを直接使用
const process = new MlxProcess('mlx-community/gemma-3-27b-it-qat-4bit');

// Chat API - 生のメッセージを送信
const messages: MlxMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
];
const chatStream = await process.chat(messages);

// Completion API - 生のプロンプトを送信
const completionStream = await process.completion('Write a story about...');

// モデル情報取得
const capabilities = await process.getCapabilities();
console.log('Available methods:', capabilities.methods);
console.log('Has chat template:', capabilities.features.apply_chat_template);

// フォーマットテスト（チャットテンプレートの動作確認）
const formatTest = await process.formatTest(messages);
console.log('Formatted prompt:', formatTest.result);

// 終了
process.exit();
```

**公開API:**
- `MlxProcess` クラス
- `MlxMessage` 型

**MlxProcess メソッド:**
- `chat(messages, primer?, options?)`: Chat APIを使用してストリーム生成
- `completion(prompt, options?)`: Completion APIを使用してストリーム生成
- `getCapabilities()`: モデルの機能情報を取得
- `formatTest(messages, options?)`: チャットテンプレートのフォーマット結果をテスト
- `exit()`: プロセスを終了

**注意:**
- `MlxProcess`は`MlxDriver`よりも低レベルなAPIです
- モデル固有の前処理（メッセージマージ、プロンプトフォーマットなど）は**ユーザーの責任**となります
- `MlxDriver`は内部的に`MlxProcess`を使用し、適切な前処理を自動的に行います
- 通常の用途では`MlxDriver`の使用を推奨します
- その他の型（`MlxMlModelOptions`など）が必要な場合は型推論を利用してください

### テストドライバー

開発とテスト用のモックドライバー。

```typescript
import { TestDriver } from '@modular-prompt/driver';

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
const { stream, result } = await driver.streamQuery(prompt);
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 最終結果を取得
const finalResult = await result;
console.log('\nUsage:', finalResult.usage);
```

## カスタムドライバーの作成

独自のドライバーを作成するには、`AIDriver`インターフェースを実装します：

```typescript
import type { AIDriver, CompiledPrompt, QueryOptions, QueryResult, StreamResult } from '@modular-prompt/driver';

export class CustomDriver implements AIDriver {
  private apiKey: string;
  private model: string;

  constructor(config: CustomConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    // その他の初期化コード
  }

  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // プロンプトをAPIリクエストに変換
    const response = await yourAPI.complete({
      prompt: prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });

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

  async streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult> {
    const stream = await yourAPI.stream(prompt, options);

    // ストリーミングレスポンスを処理
    const chunks: string[] = [];
    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          chunks.push(chunk.text);
          yield chunk.text;
        }
      }
    };

    return {
      stream: asyncIterable,
      result: Promise.resolve({
        content: chunks.join(''),
        finishReason: 'stop'
      })
    };
  }

  async close(): Promise<void> {
    // リソースのクリーンアップ
    await yourAPI.disconnect();
  }
}
```

## フォーマッター設定

ドライバーはプロンプトのフォーマット方法をカスタマイズできます。FormatterOptionsを使用して、マーカー、プリアンブル、セクション説明などをカスタマイズします：

```typescript
import type { FormatterOptions } from '@modular-prompt/driver';

export class CustomDriver implements AIDriver {
  private formatterOptions: FormatterOptions;

  constructor(config: CustomConfig) {
    // フォーマッターオプションの設定
    this.formatterOptions = {
      preamble: 'Custom instructions for the AI',
      sectionDescriptions: {
        instructions: 'Follow these instructions carefully',
        data: 'Process this data',
        output: 'Generate output here'
      },
      lineBreak: '\n',
      // 必要に応じて他のオプションも設定
      ...config.formatterOptions
    };
  }

  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // フォーマッターを使用してプロンプトを変換
    const formattedPrompt = formatCompletionPrompt(prompt, this.formatterOptions);
    // または
    const messages = formatPromptAsMessages(prompt, this.formatterOptions);

    // APIに送信...
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
  streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult>;

  // リソースのクリーンアップ
  close(): Promise<void>;
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

### StreamResult

```typescript
interface StreamResult {
  stream: AsyncIterable<string>;  // ストリームチャンク
  result: Promise<QueryResult>;   // 最終結果
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
import { OpenAIDriver, AnthropicDriver, VertexAIDriver } from '@modular-prompt/driver';

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

  const { stream, result } = await driver.streamQuery(prompt);
  for await (const chunk of stream) {
    process.stdout.write(chunk);
    totalChars += chunk.length;

    // プログレス情報を別の行に表示
    process.stderr.write(`\r[${totalChars} characters generated]`);
  }

  const finalResult = await result;
  console.log(`\nComplete! (${finalResult.usage?.totalTokens} tokens)`);
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