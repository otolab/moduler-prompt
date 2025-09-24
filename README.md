# Moduler Prompt

プロンプトを再利用可能なモジュールとして構築・管理するTypeScriptフレームワーク。

## なぜModuler Promptを使うのか

複雑な生成AIタスクにおいて、プロンプトエンジニアリングは重要だが管理が困難である。本フレームワークは以下の課題を解決する：

- **再利用性** - 一度作成したプロンプトモジュールを異なるコンテキストで再利用
- **保守性** - プロンプトを構造化し、変更や拡張を容易に
- **型安全性** - TypeScriptの型システムでランタイムエラーを防止
- **柔軟性** - 実行時にコンテキストに応じてプロンプトを動的生成

## 主な特徴

- **モジュール化** - プロンプトを再利用可能なモジュールとして構築
- **動的生成** - 実行時のコンテキストに基づいたプロンプト生成
- **マルチモデル対応** - OpenAI、Anthropic、Google、ローカルLLMに対応
- **構造化出力** - JSONスキーマに基づく構造化データの取得（ベストエフォート）
- **ストリーム処理** - 大規模データの効率的な処理
- **型安全** - TypeScriptによる完全な型定義
- **柔軟なマージ** - モジュールの再帰的統合と順序制御

## プロジェクト構造

このプロジェクトはnpm workspacesを使用したモノレポ構造です：

```
@moduler-prompt/
├── core/         # コア機能（型定義、マージ、コンパイル）
├── driver/       # 各種AIモデルドライバ（OpenAI、Anthropic、VertexAI、MLX等）
├── utils/        # ユーティリティ（レジストリ、フォーマッター）
├── process/      # ストリーム処理とマテリアル管理
└── simple-chat/  # サンプル実装: チャットアプリケーション
```

## ドキュメント

### ユーザー向けドキュメント
- [コンセプトと設計思想](./docs/CONCEPTS.md) - フレームワークの理念と課題解決アプローチ
- [アーキテクチャ](./docs/ARCHITECTURE.md) - システム構成と技術詳細
- [モジュールの作り方](./docs/CREATING_MODULES.md) - プロンプトモジュールの作成方法
- [モジュールの使い方](./docs/USING_MODULES.md) - モジュールの実行とドライバー連携
- [動作確認手順](./docs/VERIFYING_MODULES.md) - モジュールのテストとデバッグ
- [ドライバーAPI](./docs/DRIVER_API.md) - AIモデルドライバーのAPI仕様
- [Structured Outputs](./docs/STRUCTURED_OUTPUTS.md) - 構造化出力（JSON）の仕様と使用方法
- [ユーティリティ](./docs/UTILITIES.md) - ログシステムとその他のユーティリティ

### 開発者向けドキュメント
- [CLAUDE.md](./CLAUDE.md) - Claude Code向けのインデックス
- [ドキュメント同期ガイド](./prompts/document-code-sync.md) - ドキュメントとコードの同期管理
- [校正ガイド](./prompts/DOCUMENT_PROOFREADING_GUIDE.md) - ドキュメント校正の指針

## クイックスタート

### インストール

```bash
npm install @moduler-prompt/core @moduler-prompt/driver
```

### 基本的な使用例

```typescript
import { merge, compile, createContext } from '@moduler-prompt/core';
import type { PromptModule, ChunkElement } from '@moduler-prompt/core';

// モジュールの定義
interface AnalysisContext {
  sourceCode: string;
  language: string;
}

const analysisModule: PromptModule<AnalysisContext> = {
  createContext: () => ({
    sourceCode: '',
    language: 'javascript'
  }),
  
  objective: ['コードの品質を分析する'],
  instructions: ['静的解析を実行', 'パフォーマンス問題を特定'],
  
  chunks: [
    (context) => ({
      type: 'chunk',
      content: context.sourceCode,
      partOf: `main.${context.language}`
    } as ChunkElement)
  ],
  
  cue: ['分析結果をJSON形式で出力']
};

// 実行
const context = createContext(analysisModule);
context.sourceCode = 'const example = () => { ... }';

const compiled = compile(analysisModule, context);
// compiledは instructions, data, output のElement配列を含む
```

### 構造化出力（Structured Outputs）

AIからの応答を構造化されたJSONとして取得できます：

```typescript
import { OpenAIDriver } from '@moduler-prompt/driver';

// スキーマを定義してプロンプトに含める
const prompt = compile(module, context);
prompt.metadata = {
  outputSchema: {
    type: 'object',
    properties: {
      issues: { type: 'array', items: { type: 'string' } },
      score: { type: 'number' },
      suggestions: { type: 'array', items: { type: 'string' } }
    }
  }
};

// ドライバーで実行
const driver = new OpenAIDriver({ apiKey: process.env.OPENAI_API_KEY });
const result = await driver.query(prompt);

// 構造化データを取得
if (result.structuredOutput) {
  const analysis = result.structuredOutput;
  console.log('Score:', analysis.score);
  console.log('Issues:', analysis.issues);
}
```

詳細は[Structured Outputs仕様](./docs/STRUCTURED_OUTPUTS.md)を参照してください。

## 開発

### セットアップ

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# テスト
npm run test

# 開発モード
npm run dev
```

### ワークスペースコマンド

```bash
# 特定のワークスペースでコマンドを実行
npm run build --workspace=@moduler-prompt/core
npm run test --workspace=@moduler-prompt/driver

# すべてのワークスペースでコマンドを実行
npm run build --workspaces
```

## コントリビューション

プルリクエストを歓迎する。大きな変更の場合は、まずIssueを開いて変更内容を議論する。

## ライセンス

[MIT License](LICENSE)