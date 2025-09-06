# ワークフローAPI

## streamProcess

状態を保持しながら逐次的にチャンクを処理します。

```typescript
async function streamProcess(
  driver: AIDriver,
  module: PromptModule<StreamProcessingContext>,
  context: StreamProcessingContext,
  options?: StreamWorkflowOptions
): Promise<WorkflowResult<StreamProcessingContext>>
```

### コンテキスト

```typescript
interface StreamProcessingContext {
  chunks: Array<{ content: string; usage?: number }>;
  state?: { content: string; usage: number };
  range?: { start: number; end: number };
  targetTokens?: number;
}
```

### オプション

```typescript
interface StreamWorkflowOptions {
  tokenLimit?: number;    // デフォルト: 128000
  maxChunk?: number;      // デフォルト: 100
  targetTokens?: number;
}
```

## concatProcess

各チャンクを独立して処理し、結果を結合します。

```typescript
async function concatProcess(
  driver: AIDriver,
  module: PromptModule<ConcatProcessContext>,
  context: ConcatProcessContext,
  options?: ConcatProcessOptions
): Promise<WorkflowResult<ConcatProcessContext>>
```

### コンテキスト

```typescript
interface ConcatProcessContext {
  chunks: Array<{ content: string; usage?: number }>;
  results?: string[];
  processedCount?: number;
}
```

### オプション

```typescript
interface ConcatProcessOptions {
  batchSize?: number;     // デフォルト: 1
  separator?: string;     // デフォルト: "\n"
  parallel?: boolean;     // デフォルト: false
}
```

## エラーハンドリング

```typescript
class WorkflowExecutionError<TContext> extends Error {
  context: TContext;
  partialResult?: string;
  phase?: string;
  finishReason?: 'stop' | 'length' | 'error';
}
```

動的エラー時にスローされ、コンテキストから処理を再開できます。