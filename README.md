# Moduler Prompt

モジュラープロンプトは、複雑なプロンプト文章を「モジュール」という単位で組み合わせて実行する生成AIフレームワークです。

## 特徴

- 📦 **モジュール化**: プロンプトを再利用可能なモジュールとして構築
- 🔄 **動的生成**: 実行時のコンテキストに基づいたプロンプト生成
- 🎯 **マルチモデル対応**: 様々な生成AIモデルへの統一インターフェース
- 🚀 **ストリーム処理**: 大規模データの効率的な処理
- 🛠️ **型安全**: TypeScriptによる完全な型定義
- 🔀 **柔軟なマージ**: モジュールの再帰的統合と順序制御

## プロジェクト構造

このプロジェクトはnpm workspacesを使用したモノレポ構造です：

```
@moduler-prompt/
├── core/       # コア機能（モジュール、コンテキスト、ビルダー）
├── driver/     # 各種AIモデルドライバ
└── process/    # 典型的処理パターン（今後実装予定）
```

## ドキュメント

- [はじめに](./docs/GETTING_STARTED.md) - クイックスタートガイド
- [API リファレンス](./docs/API.md) - 詳細なAPI仕様
- [仕様書 v2](./docs/PROMPT_MODULE_SPEC_V2.md) - プロンプトモジュール仕様
- [コンセプトと設計思想](./docs/IDEAS.md) - フレームワークの理念
- [既存実装の分析](./docs/EXISTING_IMPLEMENTATION.md) - 旧バージョンの分析

## インストール

```bash
npm install @moduler-prompt/core @moduler-prompt/driver
```

## 使用例

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