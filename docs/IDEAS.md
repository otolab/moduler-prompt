# モジュラープロンプト - コンセプトと設計思想

## 概要

「モジュラープロンプト」は、複雑なプロンプト文章を「モジュール」という単位で組み合わせて実行する生成AIフレームワークです。プロンプトエンジニアリングの複雑性を管理し、再利用可能なコンポーネントとして構築することを目指します。

## コア概念

### 1. モジュール化されたプロンプト構成

プロンプトは以下の3つの主要セクションで構成されます：

- **指示セクション（Instructions）**：生成AIへの指示・役割・処理手順
- **データセクション（Data）**：処理対象となる情報・参考資料
- **出力セクション（Output）**：期待される出力形式・構造

各セクションは「エレメント」という単位で構成され、柔軟な組み合わせが可能です。

### 2. エレメント（Element）

エレメントはプロンプトの最小構成単位で、以下の要素を含むことができます：

- **自由記述テキスト**：通常の文字列
- **箇条書き**：構造化された指示や情報
- **子エレメント**：階層構造（深さ制限あり）
- **メディア**：画像やその他の添付ファイル
- **動的コンテンツ**：実行時に生成される内容

各エレメントは、対象モデルに応じて適切な特殊トークンでタグ付けされます。

### 3. プロンプトモジュール

プロンプトモジュールは実際にはテンプレートであり、以下の特徴を持ちます：

#### マージ可能性
複数のモジュールを組み合わせることができます。同名のエレメントは自動的にマージされます。

```javascript
// 例：2つのモジュールのマージ
const module1 = { objective: ['- タスクAを実行'] };
const module2 = { objective: ['- タスクBも考慮'] };
// マージ結果
const merged = { objective: ['- タスクAを実行', '- タスクBも考慮'] };
// 最終的なプロンプト内では：
// ## Objective
// - タスクAを実行
// - タスクBも考慮
```

#### 関数の埋め込み
モジュールには関数を含めることができ、実行時のコンテキストに基づいて動的にコンテンツを生成します。

```javascript
const dynamicModule = {
  materials: [
    (context) => {
      // コンテキストに基づいて資料を動的に選択・生成
      return context.materials?.map(m => m.content) || [];
    }
  ]
};
```

### 4. コンテキスト（Context）

コンテキストはプロンプト生成時の実行環境を表し、以下を含みます：

- **資料（Materials）**：参考文献やドキュメント
- **状態（State）**：現在の会話状態や処理状態
- **処理チャンク（Chunks）**：分割された処理対象データ
- **メッセージ履歴**：過去の対話履歴
- **処理範囲**：大規模データの部分処理指定

### 5. ドライバ（Driver）

ドライバは生成AIモデルへの抽象化レイヤーで、以下の責任を持ちます：

#### 統一インターフェース
```javascript
// すべてのドライバは query() メソッドを提供
driver.query(prompt, options);
// 内部的な chat() や completion() は隠蔽される
```

#### ストリーム処理
大規模な出力に対応するため、ストリーム出力を基本とします。

#### モデル固有の変換
エレメントを各生成AIモデルの形式に変換します：
- OpenAI API形式のメッセージ配列
- Anthropic Claude形式
- Google Vertex AI形式
- その他のモデル固有形式

### 6. プロセス（Process）

典型的な処理パターンを「プロセス」として内蔵します：

#### ストリーム処理プロセス
長大なデータを順次処理する一般的なパターン：

```javascript
const streamProcess = {
  promptModule: streamProcessingModule,
  workflow: {
    // チャンクごとに繰り返し実行
    forEach: 'chunks',
    accumulate: true,
    mergeStrategy: 'concatenate'
  }
};
```

#### その他の典型的プロセス
- **要約プロセス**：大量のテキストを段階的に要約
- **対話プロセス**：会話コンテキストを維持しながら応答生成
- **分析プロセス**：データを複数の観点から分析

## アーキテクチャ

### パッケージ構成（npm workspaces）

```
@moduler-prompt/
├── core/           # コア機能（モジュール、コンテキスト、ビルダー）
├── driver/         # 各種AIモデルドライバ
│   ├── openai/
│   ├── anthropic/
│   ├── vertexai/
│   └── ...
├── process/        # 典型的処理パターン
└── utils/          # 共通ユーティリティ
```

## 利点

### 1. 再利用性
- プロンプトモジュールを一度定義すれば、様々な場面で再利用可能
- 組織内でのベストプラクティスの共有が容易

### 2. 保守性
- モジュール単位での管理により、変更の影響範囲を限定
- バージョン管理との親和性が高い

### 3. 柔軟性
- 実行時のコンテキストに応じた動的なプロンプト生成
- 異なるAIモデルへの切り替えが容易

### 4. スケーラビリティ
- ストリーム処理により大規模データの処理が可能
- チャンク単位での並列処理にも対応

## 使用例

### 基本的な使用

```javascript
import { mergePrompts, buildPrompt } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver';

// モジュールの定義
const analysisModule = {
  objective: ['コードの品質を分析する'],
  instructions: ['静的解析を実行', 'パフォーマンス問題を特定'],
  cue: ['分析結果をJSON形式で出力']
};

// コンテキストの準備
const context = {
  chunks: [{ content: sourceCode, partOf: 'main.js' }]
};

// プロンプトのビルド
const prompt = buildPrompt(mergePrompts(analysisModule), context);

// 実行
const driver = new OpenAIDriver({ model: 'gpt-4' });
const result = await driver.query(prompt);
```

### プロセスの使用

```javascript
import { StreamProcess } from '@moduler-prompt/process';

const process = new StreamProcess({
  module: summarizeModule,
  chunkSize: 1000,
  overlap: 100
});

const summary = await process.execute(largeDocument);
```

## 今後の発展

### 短期目標
- 主要なAIモデルドライバの実装
- 基本的なプロセスパターンの整備
- TypeScript型定義の完全化

### 中期目標
- プロンプトモジュールのマーケットプレイス
- ビジュアルプロンプトビルダー
- A/Bテスト機能

### 長期目標
- 自動最適化機能
- マルチモーダル対応の強化
- エンタープライズ向け機能（監査、コンプライアンス）

## まとめ

モジュラープロンプトは、生成AIアプリケーション開発における複雑性を管理し、効率的で保守可能なプロンプトエンジニアリングを実現するフレームワークです。モジュール化、抽象化、そして典型的パターンの提供により、開発者はより本質的な問題解決に集中できるようになります。