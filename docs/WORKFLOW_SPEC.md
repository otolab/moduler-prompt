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
  partial?: string;         // 部分的な出力
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

### 3. AnalysisWorkflow

コンテンツの詳細分析。

**コンテキスト**:
- `content`: 分析対象
- `analysisType`: 分析タイプ
- `criteria`: 分析基準
- `currentAnalysis`: 現在の分析結果

**オプション**:
- `type`: 分析タイプ (structure/content/quality/comprehensive)
- `depth`: 分析深度 (shallow/deep)
- `criteria`: カスタム分析基準
- `chunkSize`: チャンクサイズ

**処理フロー**:
1. コンテンツをチャンクに分割
2. 浅い分析: 単一パスで分析
3. 深い分析: StreamProcessingを使用して段階的分析
4. 分析結果の統合

## ワークフロー間の連携

ワークフローは独立していますが、必要に応じて連携可能：

```typescript
// SummarizeWorkflow内でStreamProcessingを利用
const summarizeModule = merge(
  streamProcessing,
  contentSummarize
);

// DialogueWorkflow内でSummarizeWorkflowを利用（将来実装）
class DialogueWorkflow {
  private summarizer?: SummarizeWorkflow;
  
  async execute(...) {
    if (needsSummarization) {
      const summary = await this.summarizer.summarize(...);
      // 要約結果を使用
    }
  }
}
```

## エラーハンドリングと再開

```typescript
try {
  const result = await workflow.execute(driver, context, options);
} catch (error) {
  if (isWorkflowError(error)) {
    // エラー時点のコンテキストで再開可能
    const recoveredResult = await workflow.execute(
      driver, 
      error.context,  // 保存されたコンテキスト
      options
    );
  }
}
```

## 使用例

```typescript
// DialogueWorkflow
const dialogue = new DialogueWorkflow();
const result = await dialogue.respond(
  driver,
  "こんにちは",
  { messages: [] },
  { twoPass: true }
);

// SummarizeWorkflow
const summarizer = new SummarizeWorkflow();
const summary = await summarizer.summarize(
  driver,
  longText,
  { targetTokens: 500, enableAnalysis: true }
);

// AnalysisWorkflow
const analyzer = new AnalysisWorkflow();
const analysis = await analyzer.analyze(
  driver,
  codeContent,
  { type: 'structure', depth: 'deep' }
);
```

## 今後の拡張

- ストリーミング実行のサポート
- ワークフローの合成・パイプライン
- 進捗レポート機能
- メトリクス収集