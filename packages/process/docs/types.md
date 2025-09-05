# 型定義

## 概要

`@moduler-prompt/process`パッケージで使用される主要な型定義のリファレンスです。

## ワークフロー関連

### WorkflowResult

ワークフローの実行結果を表す型です。

```typescript
interface WorkflowResult<TContext> {
  output: string;                // 処理結果のテキスト
  context: TContext;             // 更新されたコンテキスト
  metadata?: {                   // オプショナルなメタデータ
    [key: string]: any;
  };
}
```

### WorkflowError

ワークフローエラーのインターフェースです。

```typescript
interface WorkflowError<TContext> extends Error {
  context: TContext;             // エラー時のコンテキスト
  partialResult?: string;        // 部分的な処理結果
  phase?: string;                // エラーが発生したフェーズ
}
```

### WorkflowExecutionError

ワークフロー実行時のエラークラスです。

```typescript
class WorkflowExecutionError<TContext = any> extends Error implements WorkflowError<TContext> {
  public context: TContext;
  public partialResult?: string;
  public phase?: string;
  
  constructor(
    originalError: Error | string,
    context: TContext,
    options?: {
      partialResult?: string;
      phase?: string;
    }
  );
}
```

## AIドライバー関連

### AIDriver

AI モデルとの通信を行うドライバーのインターフェースです。

```typescript
interface AIDriver {
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  streamQuery?(prompt: CompiledPrompt, options?: QueryOptions): AsyncIterable<string>;
  close?(): Promise<void>;
}
```

### QueryResult

AIモデルからのクエリ結果です。

```typescript
interface QueryResult {
  content: string;               // 生成されたテキスト
  usage?: {                      // トークン使用量
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}
```

### QueryOptions

クエリ実行時のオプションです。

```typescript
interface QueryOptions {
  temperature?: number;          // 0.0-2.0: 創造性の制御
  maxTokens?: number;           // 最大生成トークン数
  topP?: number;                // 0.0-1.0: 累積確率閾値
  stream?: boolean;             // ストリーミングの有効化
}
```

## コンテキスト型

### StreamProcessingContext

ストリーム処理用のコンテキストです。

```typescript
interface StreamProcessingContext {
  chunks?: Array<{
    content: string;            // チャンクの内容
    partOf?: string;           // 所属元の識別子
    usage?: number;            // トークン使用量
    attachments?: any[];       // 添付データ
  }>;
  state?: {
    content: string;           // 現在の状態
    usage?: number;            // 状態のトークン数
  };
  range?: {
    start?: number;            // 処理開始位置
    end?: number;              // 処理終了位置
  };
  targetTokens?: number;       // 目標トークン数
}
```

### ConcatProcessContext

結合処理用のコンテキストです。

```typescript
interface ConcatProcessContext {
  chunks: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    metadata?: Record<string, any>;
  }>;
  results?: string[];          // 処理済み結果のリスト
  processedCount?: number;     // 処理済みチャンク数
}
```

### DialogueContext

対話処理用のコンテキストです。

```typescript
interface DialogueContext {
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

### DialogueWorkflowContext

対話ワークフロー用の拡張コンテキストです。

```typescript
interface DialogueWorkflowContext extends DialogueContext, MaterialContext {
  preparationNote?: {
    content: string;           // 準備ノート（2パス処理用）
  };
}
```

### MaterialContext

参考資料用のコンテキストです。

```typescript
interface MaterialContext {
  materials?: Array<{
    title: string;             // 資料のタイトル
    content: string;           // 資料の内容
    type?: string;            // 資料のタイプ
    metadata?: Record<string, any>;  // メタデータ
  }>;
}
```

### SummarizeWorkflowContext

要約ワークフロー用のコンテキストです。

```typescript
interface SummarizeWorkflowContext {
  state?: {
    content: string;
    usage?: number;
  };
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    attachments?: any[];
  }>;
  preparationNote?: {
    content: string;
  };
  targetTokens?: number;
  range?: {
    start: number;
    end: number;
  };
  analysisReport?: string;     // 分析レポート
  phase?: 'analysis' | 'summarization' | 'complete';
}
```

## オプション型

### StreamWorkflowOptions

ストリームワークフローのオプションです。

```typescript
interface StreamWorkflowOptions {
  tokenLimit?: number;         // バッチあたりの最大トークン数
  maxChunk?: number;          // バッチあたりの最大チャンク数
  targetTokens?: number;      // 目標トークン数
}
```

### ConcatProcessOptions

結合処理のオプションです。

```typescript
interface ConcatProcessOptions {
  batchSize?: number;         // バッチサイズ
  separator?: string;         // 結果の結合セパレータ（デフォルト: '\n'）
  parallel?: boolean;         // 並列処理の有効化
}
```

### DialogueWorkflowOptions

対話ワークフローのオプションです。

```typescript
interface DialogueWorkflowOptions {
  twoPass?: boolean;          // 2パス処理の有効化
  maintainState?: boolean;    // 状態維持の有効化
  includematerials?: boolean; // 参考資料の含有
}
```

### SummarizeWorkflowOptions

要約ワークフローのオプションです。

```typescript
interface SummarizeWorkflowOptions {
  targetTokens: number;       // 目標トークン数（必須）
  enableAnalysis?: boolean;   // 分析フェーズの有効化
}
```

## 型ガード

### WorkflowExecutionErrorの判定

```typescript
function isWorkflowExecutionError(error: unknown): error is WorkflowExecutionError {
  return error instanceof WorkflowExecutionError;
}

// 使用例
try {
  const result = await streamProcess(driver, module, context, options);
} catch (error) {
  if (isWorkflowExecutionError(error)) {
    console.log('Context:', error.context);
    console.log('Partial result:', error.partialResult);
  }
}
```

## ジェネリック型の使用

### カスタムコンテキスト

```typescript
// カスタムコンテキスト型の定義
interface MyCustomContext extends StreamProcessingContext {
  customField: string;
  customData: any[];
}

// ワークフローでの使用
const result: WorkflowResult<MyCustomContext> = await streamProcess(
  driver,
  module as PromptModule<MyCustomContext>,
  myContext,
  options
);

// 型安全なアクセス
console.log(result.context.customField);
```

### 型の拡張

```typescript
// 既存の型を拡張
interface ExtendedDialogueContext extends DialogueContext {
  userProfile?: {
    name: string;
    preferences: Record<string, any>;
  };
  sessionId?: string;
}

// カスタムワークフロー関数
async function customDialogueProcess(
  driver: AIDriver,
  module: PromptModule<ExtendedDialogueContext>,
  context: ExtendedDialogueContext,
  options?: DialogueWorkflowOptions
): Promise<WorkflowResult<ExtendedDialogueContext>> {
  // 実装
}
```

## 型のインポート

```typescript
// 基本的な型のインポート
import type {
  AIDriver,
  WorkflowResult,
  WorkflowExecutionError
} from '@moduler-prompt/process/workflows';

// コンテキスト型のインポート
import type {
  StreamProcessingContext,
  ConcatProcessContext,
  DialogueWorkflowContext,
  SummarizeWorkflowContext
} from '@moduler-prompt/process/workflows';

// オプション型のインポート
import type {
  StreamWorkflowOptions,
  ConcatProcessOptions,
  DialogueWorkflowOptions,
  SummarizeWorkflowOptions
} from '@moduler-prompt/process/workflows';
```