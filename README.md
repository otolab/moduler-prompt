# Moduler Prompt

モジュラープロンプトは、複雑なプロンプト文章を「モジュール」という単位で組み合わせて実行する生成AIフレームワークです。

## 特徴

- 📦 **モジュール化**: プロンプトを再利用可能なモジュールとして構築
- 🔄 **動的生成**: 実行時のコンテキストに基づいたプロンプト生成
- 🎯 **マルチモデル対応**: 様々な生成AIモデルへの統一インターフェース
- 🚀 **ストリーム処理**: 大規模データの効率的な処理
- 🛠️ **型安全**: TypeScriptによる完全な型定義

## プロジェクト構造

このプロジェクトはnpm workspacesを使用したモノレポ構造です：

```
@moduler-prompt/
├── core/       # コア機能（モジュール、コンテキスト、ビルダー）
├── driver/     # 各種AIモデルドライバ
└── process/    # 典型的処理パターン（今後実装予定）
```

## ドキュメント

- [コンセプトと設計思想](./docs/IDEAS.md)
- [既存実装の分析](./docs/EXISTING_IMPLEMENTATION.md)

## インストール

```bash
npm install @moduler-prompt/core @moduler-prompt/driver
```

## 使用例

```javascript
import { mergePrompts, buildPrompt } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver/openai';

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

## ライセンス

MIT