# ワークフロー仕様

## 概要

ワークフローは、プロンプトモジュールを実際のAIモデルで実行するための実行層です。

## 基本設計原則

1. **実行時注入**: AIドライバーは実行時に注入される
2. **コンテキスト駆動**: コンテキストはPromptModuleで定義され、ワークフローに渡される
3. **再開可能性**: エラー時も継続可能なコンテキストを返す
4. **副作用なし**: ワークフローは独立しており、副作用を持たない
5. **キャッシュ分離**: キャッシュ機構は別途構築される

## 基本インターフェース

```typescript
interface Workflow<TContext, TOptions> {
  execute(
    driver: AIDriver,
    context: TContext,
    options?: TOptions
  ): Promise<WorkflowResult<TContext>>;
}

interface WorkflowResult<TContext> {
  output: string;           // 実行結果
  context: TContext;        // 継続可能なコンテキスト
  metadata?: Record<string, any>;
}

interface WorkflowError<TContext> extends Error {
  context: TContext;        // エラー時点のコンテキスト（再開可能）
  partialResult?: string;   // 部分的な出力
}
```

## 実装されたワークフロー

### 1. DialogueWorkflow

対話の文脈を管理しながら応答を生成。

**コンテキスト**:
- `messages`: 会話履歴
- `state?`: 会話の要約・記憶
- `materials?`: 参考資料
- `preparationNote?`: 応答準備ノート

**オプション**:
- `twoPass`: 2パス応答を有効化
- `maintainState`: 状態管理を有効化
- `includematerials`: 資料参照を有効化

**処理フロー**:
1. オプションに基づいてモジュールを構築
2. 2パスの場合：準備ノート作成 → 応答生成
3. 1パスの場合：直接応答生成
4. コンテキストを更新して返却

### 2. SummarizeWorkflow

大規模テキストを段階的に要約。

**コンテキスト**:
- `state`: 現在の要約状態
- `chunks`: 処理対象チャンク
- `preparationNote?`: 分析レポート
- `targetTokens`: 目標トークン数
- `phase`: 処理フェーズ

**オプション**:
- `targetTokens`: 目標出力サイズ
- `chunkSize`: チャンクサイズ
- `enableAnalysis`: 分析フェーズを有効化

**処理フロー**:
1. テキストをチャンクに分割
2. 分析フェーズ（オプション）: Analysis Report生成
3. 要約フェーズ: チャンクごとに要約を生成・統合
4. サイズ調整と最終出力

### 3. StreamWorkflow

ステートを保持しながらチャンクを逐次処理。

### 4. ConcatWorkflow

各チャンクを独立して処理し、結果を結合。

## エラーハンドリングと再開

ワークフローはステートレス関数として実装され、エラー時にコンテキストを返すため、処理を再開できます。
- メトリクス収集