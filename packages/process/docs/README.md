# @moduler-prompt/process

プロンプトモジュールの処理フローとワークフローを提供するパッケージです。

## 概要

`@moduler-prompt/process`は、大規模なテキスト処理や複雑な対話処理を効率的に実行するためのワークフローとモジュールを提供します。このパッケージは、`@moduler-prompt/core`のプロンプトモジュールシステムを基盤として、実用的な処理パターンを実装しています。

## コアコンセプト

### 1. ワークフロー（Workflows）

ワークフローは、プロンプトモジュールとAIドライバーを組み合わせて特定の処理パターンを実装する関数です。すべてのワークフローは以下の統一されたインターフェースを持ちます：

```typescript
async function xxxProcess(
  driver: AIDriver,
  module: PromptModule<TContext>,
  context: TContext,
  options?: TOptions
): Promise<WorkflowResult<TContext>>
```

#### 設計原則

- **ステートレス**: ワークフローは状態を持たず、すべての状態は`context`に保存される
- **再開可能**: エラー時も`context`を返すため、処理を再開できる
- **合成可能**: ワークフローは組み合わせて使用できる

### 2. 処理パターン

#### Stream Processing（ストリーム処理）
状態を保持しながら逐次的にチャンクを処理し、各反復で状態を更新します。

```
チャンク1 → 状態A
状態A + チャンク2 → 状態B
状態B + チャンク3 → 最終状態
```

#### Concat Processing（結合処理）
各チャンクを独立して処理し、結果を結合します。

```
チャンク1 → 結果1
チャンク2 → 結果2
チャンク3 → 結果3
最終結果 = 結果1 + 結果2 + 結果3
```

### 3. コンテキスト管理

すべての状態はコンテキストオブジェクトに保存されます：

- **chunks**: 処理対象のテキストチャンク
- **state**: 現在の処理状態（stream処理）
- **results**: 処理済みの結果（concat処理）
- **range**: 処理範囲の管理
- **processedCount**: 処理済みチャンク数

### 4. エラーハンドリング

`WorkflowExecutionError`により、エラー時でも：
- 処理時点のコンテキストを保持
- 部分的な結果（partialResult）を返却
- 処理を再開可能

## 主要コンポーネント

### ワークフロー

- **streamProcess**: 状態を蓄積しながら処理
- **concatProcess**: 独立処理して結果を結合
- **dialogueProcess**: 対話型の処理
- **summarizeProcess**: 要約処理

### プロンプトモジュール

- **streamProcessing**: ストリーム処理用の基本モジュール
- **dialogue**: 対話処理用モジュール
- **summarize**: 要約処理用モジュール
- **withMaterials**: 参考資料を含める拡張モジュール

## インストール

```bash
npm install @moduler-prompt/process
```

## 使用方法

### 基本的な使用例

```typescript
import { streamProcess } from '@moduler-prompt/process';
import { streamProcessing } from '@moduler-prompt/process/modules';
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver({ responses: ['処理結果'] });

const context = {
  chunks: [
    { content: 'テキスト1', usage: 100 },
    { content: 'テキスト2', usage: 100 }
  ]
};

const result = await streamProcess(
  driver,
  streamProcessing,
  context,
  { maxChunk: 2 }
);

console.log(result.output); // 最終的な処理結果
console.log(result.context); // 更新されたコンテキスト
```

### エラーからの復帰

```typescript
try {
  const result = await streamProcess(driver, module, context, options);
} catch (error) {
  if (error instanceof WorkflowExecutionError) {
    // エラー時のコンテキストと部分結果を取得
    const { context, partialResult } = error;
    
    // 処理を再開
    const result = await streamProcess(driver, module, context, options);
  }
}
```

## API リファレンス

詳細なAPIドキュメントは以下を参照してください：

- [ワークフローAPI](./workflows.md)
- [モジュールAPI](./modules.md)
- [型定義](./types.md)

## ライセンス

MIT