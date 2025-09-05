# ワークフローAPI

## 概要

ワークフローは、プロンプトモジュールとAIドライバーを組み合わせて特定の処理パターンを実装する関数です。

## 共通インターフェース

### WorkflowResult

すべてのワークフローは`WorkflowResult<TContext>`を返します：

```typescript
interface WorkflowResult<TContext> {
  output: string;           // 処理結果
  context: TContext;        // 更新されたコンテキスト
  metadata?: {              // メタデータ
    [key: string]: any;
  };
}
```

### WorkflowExecutionError

エラー時には`WorkflowExecutionError`がスローされます：

```typescript
class WorkflowExecutionError<TContext> extends Error {
  context: TContext;        // エラー時のコンテキスト
  partialResult?: string;   // 部分的な処理結果
  phase?: string;          // エラーが発生したフェーズ
}
```

## ワークフロー関数

### streamProcess

状態を保持しながら逐次的にチャンクを処理します。

```typescript
async function streamProcess(
  driver: AIDriver,
  module: PromptModule<StreamProcessingContext>,
  context: StreamProcessingContext,
  options?: StreamWorkflowOptions
): Promise<WorkflowResult<StreamProcessingContext>>
```

#### コンテキスト

```typescript
interface StreamProcessingContext {
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    attachments?: any[];
  }>;
  state?: {
    content: string;
    usage?: number;
  };
  range?: {
    start?: number;
    end?: number;
  };
  targetTokens?: number;
}
```

#### オプション

```typescript
interface StreamWorkflowOptions {
  tokenLimit?: number;    // バッチあたりの最大トークン数
  maxChunk?: number;      // バッチあたりの最大チャンク数
  targetTokens?: number;  // 目標トークン数
}
```

#### 使用例

```typescript
import { streamProcess } from '@moduler-prompt/process';
import { streamProcessing } from '@moduler-prompt/process/modules';

const result = await streamProcess(
  driver,
  streamProcessing,
  {
    chunks: [
      { content: 'チャンク1', usage: 100 },
      { content: 'チャンク2', usage: 100 }
    ]
  },
  { maxChunk: 1 }
);

// 結果: チャンク1を処理した状態にチャンク2を追加処理した最終状態
```

### concatProcess

各チャンクを独立して処理し、結果を結合します。

```typescript
async function concatProcess(
  driver: AIDriver,
  module: PromptModule<ConcatProcessContext>,
  context: ConcatProcessContext,
  options?: ConcatProcessOptions
): Promise<WorkflowResult<ConcatProcessContext>>
```

#### コンテキスト

```typescript
interface ConcatProcessContext {
  chunks: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    metadata?: Record<string, any>;
  }>;
  results?: string[];       // 処理済み結果
  processedCount?: number;  // 処理済みチャンク数
}
```

#### オプション

```typescript
interface ConcatProcessOptions {
  batchSize?: number;     // バッチサイズ
  separator?: string;     // 結果の結合セパレータ
  parallel?: boolean;     // 並列処理の有効化
}
```

#### 使用例

```typescript
import { concatProcess } from '@moduler-prompt/process';

const result = await concatProcess(
  driver,
  module,
  {
    chunks: [
      { content: 'チャンク1' },
      { content: 'チャンク2' },
      { content: 'チャンク3' }
    ]
  },
  { 
    parallel: true,
    separator: '\n---\n'
  }
);

// 結果: "処理1\n---\n処理2\n---\n処理3"
```

### dialogueProcess

対話型の処理を実行します。

```typescript
async function dialogueProcess(
  driver: AIDriver,
  module: PromptModule<DialogueWorkflowContext>,
  context: DialogueWorkflowContext,
  options?: DialogueWorkflowOptions
): Promise<WorkflowResult<DialogueWorkflowContext>>
```

#### コンテキスト

```typescript
interface DialogueWorkflowContext {
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  materials?: Array<{
    title: string;
    content: string;
  }>;
  preparationNote?: {
    content: string;
  };
}
```

#### オプション

```typescript
interface DialogueWorkflowOptions {
  twoPass?: boolean;          // 2パス処理の有効化
  maintainState?: boolean;    // 状態維持の有効化
  includematerials?: boolean; // 参考資料の含有
}
```

#### 使用例

```typescript
import { dialogueProcess } from '@moduler-prompt/process';
import { dialogueBase } from '@moduler-prompt/process/modules';

const result = await dialogueProcess(
  driver,
  dialogueBase,
  {
    messages: [
      { role: 'user', content: 'こんにちは' }
    ]
  },
  { twoPass: true }
);

// 結果: アシスタントの応答
// context.messagesに応答が追加される
```

### summarizeProcess

テキストの要約処理を実行します。

```typescript
async function summarizeProcess(
  driver: AIDriver,
  module: PromptModule<SummarizeWorkflowContext>,
  context: SummarizeWorkflowContext,
  options: SummarizeWorkflowOptions
): Promise<WorkflowResult<SummarizeWorkflowContext>>
```

#### コンテキスト

```typescript
interface SummarizeWorkflowContext {
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
  }>;
  state?: {
    content: string;
    usage?: number;
  };
  targetTokens?: number;
  analysisReport?: string;
  phase?: 'analysis' | 'summarization' | 'complete';
}
```

#### オプション

```typescript
interface SummarizeWorkflowOptions {
  targetTokens: number;      // 目標トークン数
  enableAnalysis?: boolean;  // 分析フェーズの有効化
}
```

#### 使用例

```typescript
import { summarizeProcess } from '@moduler-prompt/process';
import { summarizeBase } from '@moduler-prompt/process/modules';

const result = await summarizeProcess(
  driver,
  summarizeBase,
  {
    chunks: [
      { content: '長い文章1', usage: 1000 },
      { content: '長い文章2', usage: 1000 }
    ]
  },
  { 
    targetTokens: 500,
    enableAnalysis: true 
  }
);

// 結果: 500トークン以内の要約
```

## エラーハンドリング

### 処理の再開

ワークフローは、エラー時のコンテキストを保持するため、処理を再開できます：

```typescript
let context = initialContext;

try {
  const result = await streamProcess(driver, module, context, options);
  // 成功時の処理
} catch (error) {
  if (error instanceof WorkflowExecutionError) {
    // エラー時のコンテキストを取得
    context = error.context;
    
    // 部分結果を確認
    console.log('部分結果:', error.partialResult);
    
    // 必要に応じて処理を再開
    const result = await streamProcess(driver, module, context, options);
  }
}
```

### 部分結果の活用

```typescript
try {
  const result = await concatProcess(driver, module, context, options);
} catch (error) {
  if (error instanceof WorkflowExecutionError) {
    // 処理済みの部分結果を取得
    const partialOutput = error.partialResult;
    
    // 未処理のチャンクで再開
    const remainingContext = {
      ...error.context,
      // processedCountから再開
    };
    
    const result = await concatProcess(driver, module, remainingContext, options);
  }
}
```

## パフォーマンス最適化

### バッチ処理

```typescript
// チャンクを3つずつバッチ処理
const result = await concatProcess(
  driver,
  module,
  context,
  { batchSize: 3 }
);
```

### 並列処理

```typescript
// チャンクを並列処理
const result = await concatProcess(
  driver,
  module,
  context,
  { parallel: true }
);
```

### トークン制限

```typescript
// トークン制限を設定してメモリ使用を制御
const result = await streamProcess(
  driver,
  module,
  context,
  { 
    tokenLimit: 4000,    // バッチあたり4000トークンまで
    maxChunk: 10        // または最大10チャンク
  }
);
```