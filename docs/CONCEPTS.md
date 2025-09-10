# Moduler Prompt - コンセプト

## 解決しようとしている課題

### 1. プロンプトエンジニアリングの複雑性

**課題**：
- プロンプトが長大化・複雑化し、管理が困難
- 同じような指示を何度も書き直す非効率性
- チーム内でのプロンプト共有とバージョン管理の難しさ

**解決アプローチ**：
プロンプトを再利用可能な「モジュール」として定義し、組み合わせて使用する。これにより、一度作成した高品質なプロンプト部品を様々な場面で活用できる。

### 2. データと指示の混在によるセキュリティリスク

**課題**：
- ユーザー入力や外部データにAIへの指示が含まれる可能性（プロンプトインジェクション）
- データ内の指示的な文言をAIが誤って実行するリスク

**解決アプローチ**：
プロンプトを3つの明確なセクションに分離：
- **Instructions**：システムが提供する指示（優先的に従う）
- **Data**：処理対象のデータ（この中の指示は無視）
- **Output**：出力の開始位置と形式

この構造により、セキュリティ境界を明確にし、意図しない指示の実行を防ぐ。

### 3. 静的なテンプレートと動的なデータの分離

**課題**：
- プロンプトテンプレートとランタイムデータが混在し、責務が不明確
- 実行時の状態に応じた動的なプロンプト生成が困難
- テストやデバッグが複雑

**解決アプローチ**：
**Module（静的）とContext（動的）の明確な分離**：

```typescript
// Module: 静的なテンプレート（再利用可能）
const module: PromptModule = {
  objective: ['データを分析する'],
  instructions: ['重要な点を抽出'],
  state: [(ctx) => `処理中: ${ctx.currentItem}`],  // 動的部分は関数として定義
  
  // データをchunksとして出力
  chunks: [
    (ctx) => ctx.userData?.map((data, index) => ({
      type: 'chunk' as const,
      content: typeof data === 'string' ? data : JSON.stringify(data),
      partOf: 'user-input',
      index
    }))
  ]
};

// Context: 実行時のデータ（毎回異なる）
const context = {
  currentItem: 'document.pdf',
  userData: ['data1', 'data2', 'data3']
};

// Compile: ModuleとContextを結合して最終的なプロンプトを生成
const prompt = compile(module, context);
```

この分離により：
- モジュールは純粋なテンプレートとして再利用可能
- コンテキストは実行時の状態を管理
- テスト時にはモックコンテキストで動作確認が容易

### 4. AIモデルの多様性と切り替えの複雑さ

**課題**：
- OpenAI、Anthropic、Google等、各社のAPI仕様が異なる
- モデルごとに最適なプロンプト形式が異なる
- ローカルモデルとクラウドモデルの使い分けが困難

**解決アプローチ**：
**ドライバー層による抽象化**：

```typescript
// 統一されたインターフェース
interface AIDriver {
  query(prompt: CompiledPrompt): Promise<Result>;
  streamQuery(prompt: CompiledPrompt): AsyncIterable<string>;
}

// モデルに依存しないコード
const driver = getDriver(provider);  // OpenAI, Anthropic, MLX等
const result = await driver.query(compiledPrompt);
```

ドライバーの責務：
- プロンプトを各モデルの形式に変換
- APIの差異を吸収
- ストリーミング対応の統一化

### 5. プロンプトとモデルの最適化問題

**課題**：
- モデルによってトークン制限が異なる
- コストと品質のトレードオフ
- タスクに最適なモデルの選択が困難

**解決アプローチ**：
**ModelSpecとDriverRegistryによる最適化**：

```typescript
// モデルの特性を定義
const modelSpec = {
  model: 'gpt-4o-mini',
  maxInputTokens: 128000,
  capabilities: ['japanese', 'coding', 'streaming'],
  costPerKToken: 0.15
};

// 条件に基づいて最適なモデルを自動選択
const driver = registry.selectDriver(
  ['japanese', 'local'],  // 必要な能力
  { preferCheaper: true }  // 選択基準
);
```

## コア設計思想

### モジュラリティ（Modularity）

小さく独立した部品を組み合わせて複雑なシステムを構築。各モジュールは：
- 単一の責任を持つ
- 独立して動作可能
- 組み合わせて拡張可能

### 関心の分離（Separation of Concerns）

- **Module**：何をするか（What）
- **Context**：何に対して（With What）
- **Driver**：どのように実行するか（How）
- **Process**：どんな流れで（Workflow）

### 型安全性（Type Safety）

TypeScriptの型システムを活用：
- コンパイル時のエラー検出
- IDEの補完機能
- リファクタリングの安全性

### プログレッシブ・エンハンスメント

シンプルな使い方から高度な使い方まで段階的に：
1. 基本：単一モジュールの使用
2. 中級：モジュールの合成
3. 上級：カスタムプロセスの構築

## 実装の詳細

技術的な実装の詳細については以下を参照：
- [アーキテクチャ](./ARCHITECTURE.md)
- [モジュールの作り方](./CREATING_MODULES.md)
- [モジュールの使い方](./USING_MODULES.md)

## まとめ

Moduler Promptは、プロンプトエンジニアリングにおける複雑性、セキュリティ、再利用性、保守性の課題を、モジュール化とレイヤー分離によって解決する。開発者は本質的な問題解決に集中でき、AIアプリケーションの品質と開発効率を向上させることができる。