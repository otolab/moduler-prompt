# @moduler-prompt/process

## 概要

プロンプトモジュールを実際のAIモデルで実行するワークフローとサポートモジュールを提供します。

## 主要コンポーネント

### ワークフロー

- **streamProcess**: ステートフルな逐次処理
- **concatProcess**: 独立した処理の結合

### モジュール

- **Stream Processing**: チャンク処理とステート管理
- **Material**: 参考資料の管理
- **Dialogue**: 対話用プロンプト
- **Summarize**: 要約用プロンプト

## 基本概念

### ワークフロー

ステートレス関数として実装され、すべての状態はコンテキストに保存されます。

```typescript
export async function workflowProcess(
  driver: AIDriver,
  module: PromptModule<TContext>,
  context: TContext,
  options?: TOptions
): Promise<WorkflowResult<TContext>>
```

### エラーハンドリング

動的エラー（ネットワークエラー、finishReason !== 'stop'）のみキャッチし、コンテキストを保持して再開可能にします。

## 使用例

```typescript
import { streamProcess } from '@moduler-prompt/process';
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver(["response1", "response2"]);
const result = await streamProcess(
  driver,
  myModule,
  {
    chunks: [{content: "data1"}, {content: "data2"}],
    state: { content: "", usage: 0 }
  },
  { tokenLimit: 1000 }
);
```

## 詳細

- [ワークフローAPI](./workflows.md)
- [モジュールAPI](./modules.md)
- [型定義](../src/workflows/types.ts)