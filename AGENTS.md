# Moduler Prompt - AI Assistant Guide

AIアシスタントがコードベースを効率的に理解・操作するための統合ガイド。

## プロジェクト概要

プロンプトモジュールフレームワーク - 再利用可能なプロンプトコンポーネントをTypeScriptで構築。

## 主要ファイル

### コア実装
- `packages/core/src/types.ts` - 型定義（PromptModule、Element、DynamicContent）
- `packages/core/src/compile.ts` - モジュールのコンパイル処理
- `packages/core/src/merge.ts` - モジュールのマージ処理

### ドライバー
- `packages/driver/src/types.ts` - ドライバーインターフェース定義
- `packages/driver/src/*/` - 各AIサービス実装（openai、anthropic、vertexai、googlegenai、mlx等）

### ユーティリティ
- `packages/utils/src/driver-registry/` - ドライバーレジストリ実装
- `packages/utils/src/formatter/` - プロンプトフォーマッター

## 開発コマンド

```bash
# 依存関係のインストール（プロジェクトルートで実行）
npm install

# ビルド
npm run build

# クリーンビルド（エラー時に推奨）
npm run clean && npm run build

# 個別パッケージのビルド
npm run build -w @moduler-prompt/core
npm run build -w @moduler-prompt/driver
npm run build -w @moduler-prompt/utils
npm run build -w @moduler-prompt/process

# テスト
npm test

# 型チェック
npm run typecheck

# Lint
npm run lint

# トラブルシューティング
# - ビルドエラー時: npm run clean && npm install && npm run build
# - TypeScript参照エラー: 各パッケージで tsc --build を使用
# - 注意: npm run clean実行後は必ずnpm installが必要（node_modulesも削除されるため）
```

## 主要概念

### PromptModule
- 標準セクション（objective、instructions、state、materials等）
- DynamicContent - 実行時のコンテキストベース生成
- SimpleDynamicContent - SubSection専用の文字列生成

### Element階層
- 最大2階層：Section → SubSection → string
- 6種類の要素：Text、Message、Material、Chunk、Section、SubSection

### 処理フロー
1. モジュール定義 → 2. マージ（必要に応じて） → 3. コンパイル → 4. AIドライバーで実行

## コア機能

### 型定義 (`packages/core/src/types.ts`)

#### 主要型
- `PromptModule<TContext>` - プロンプトモジュールの基本型
- `Element` - 6種類の要素型
  - `TextElement` - テキスト要素
  - `MessageElement` - メッセージ要素（role: system/assistant/user）
  - `MaterialElement` - 資料要素（id, title, content）
  - `ChunkElement` - 分割データ要素（partOf, index, total）
  - `SectionElement` - セクション要素（第1階層）
  - `SubSectionElement` - サブセクション要素（第2階層）

#### 動的コンテンツ
- `DynamicContent<TContext>` - 動的コンテンツ生成
  - 文字列/文字列配列/Elementを返す関数
  - Section/SubSectionは生成不可
- `SimpleDynamicContent<TContext>` - SubSection専用動的コンテンツ
  - 文字列/文字列配列のみを返す関数
- `SectionContent<TContext>` - 標準セクションの内容型
  - `(string | SubSectionElement | DynamicContent<TContext>)[]`

### マージ (`packages/core/src/merge.ts`)

#### 基本動作
- `merge<TContext>(...modules)` - 複数モジュールを統合
- 同名サブセクションのitemsを結合
- createContextは全て実行して結果をマージ（後の値で上書き）

#### 順序制御
- セクション内要素の順序: 通常要素 → サブセクション
- 重複を許容（セパレータ、強調、マーカーなどの意図的な重複）

### コンパイル (`packages/core/src/compile.ts`)

#### 基本動作
- `compile(module, context?)` - モジュールをCompiledPromptに変換
- context未指定時は`module.createContext()`を自動実行
- 標準セクションを自動的にSectionElementに変換

#### DynamicContent変換ルール
- 文字列 → そのまま使用
- 文字列配列 → 展開して使用（可変長データ対応）  
- Element → 文字列に変換
- Element配列 → 各要素を文字列に変換
- null/undefined → 空配列

#### SimpleDynamicContent変換ルール（SubSection専用）
- 文字列 → そのまま使用
- 文字列配列 → 展開して使用
- null/undefined → 空配列

#### セクション分類
- instructions: objective, terms, methodology, instructions, guidelines, preparationNote
- data: state, inputs, materials, chunks, messages
- output: cue, schema

## 重要な制約とルール

### 階層構造
1. **最大2階層**: Section → SubSection → string
2. **Section内要素順序**: 通常要素 → サブセクション

### 動的コンテンツ制約
1. **DynamicContent**: Section/SubSectionを生成不可
2. **SimpleDynamicContent**: SubSection内専用、文字列のみ生成

### コンパイル時処理
1. **標準セクション自動変換**: 標準セクションはSectionElementに自動変換
2. **重複許容**: 意図的な重複（セパレータ等）をサポート

## 関連ドキュメント

### 仕様書
- [プロンプトモジュール仕様v2](./docs/PROMPT_MODULE_SPEC_V2.md)
- [旧実装分析](./docs/EXISTING_IMPLEMENTATION.md)

### ガイド
- [はじめに](./docs/GETTING_STARTED.md)
- [APIリファレンス](./docs/API.md)
- [ドキュメント同期](./prompts/document-code-sync.md)

## パッケージ構成

### コアパッケージ
- `@moduler-prompt/core` - コア機能
  - 型定義（PromptModule, Element, DynamicContent）
  - マージ機能（モジュール統合）
  - コンパイル機能（モジュール変換）

### ドライバーパッケージ
- `@moduler-prompt/driver` - AIモデルドライバー
  - OpenAI、Anthropic、VertexAI、GoogleGenAI、Ollama、MLX
  - 統一インターフェースとストリーミングサポート
  - StreamResult型: stream（AsyncIterable<string>）+ result（Promise<QueryResult>）

### ユーティリティパッケージ
- `@moduler-prompt/utils` - ユーティリティ機能
  - ドライバーレジストリ（動的ドライバー選択）
  - フォーマッター（テキスト/メッセージ形式変換）

### 処理パッケージ
- `@moduler-prompt/process` - ストリーム処理
  - マテリアル管理モジュール
  - チャンク処理モジュール

## ドライバーアーキテクチャ

### 利用可能なドライバー

#### クラウドサービス
- **OpenAIDriver** (`packages/driver/src/openai/`)
  - GPT-4, GPT-3.5モデル対応
  - ストリーミングサポート
- **AnthropicDriver** (`packages/driver/src/anthropic/`)
  - Claudeモデル対応
  - ストリーミングサポート
- **VertexAIDriver** (`packages/driver/src/vertexai/`)
  - Google Cloud Vertex AI（Gemini）
  - ストリーミングサポート
- **GoogleGenAIDriver** (`packages/driver/src/google-genai/`)
  - GoogleGenAI SDK経由でGemini直接アクセス
  - APIキーのみで利用可能
  - ストリーミングサポート

#### ローカル実行
- **OllamaDriver** (`packages/driver/src/ollama/`)
  - ローカルLLM（OpenAI互換）
- **MlxDriver** (`packages/driver/src/mlx/`)
  - Apple Silicon最適化
  - Pythonサブプロセス経由
  - ModelSpecシステムによるchat/completion選択

#### テスト用
- **TestDriver** (`packages/driver/src/test-driver.ts`)
  - モックレスポンス
  - テスト用途

### ドライバーインターフェース
- **AIDriver** (`packages/driver/src/types.ts`)
  - 全ドライバーが実装する統一インターフェース
  - query: 通常クエリ実行
  - streamQuery: ストリーミングクエリ（StreamResult型を返す）
  - close: リソースクリーンアップ
  - 各ドライバーが独立してCompiledPromptを処理

## テスト構成
- ユニットテスト：`*.test.ts`（実装と同階層）
- 統合テスト：`integration.test.ts`
- E2Eテスト：`simple-chat/src/*.e2e.test.ts`

## CI/CD
- GitHub Actions：`.github/workflows/ci.yml`
- Node.js 20.x、自動テスト実行

---

---

# 詳細仕様

通常の作業では上記情報で十分である。以下は詳細仕様。

## 使用例

### DynamicContentの基本使用

```typescript
const module: PromptModule<{ items: string[] }> = {
  state: [
    // 文字列を直接返す
    (ctx) => `アイテム数: ${ctx.items.length}`,
    
    // 文字列配列を直接返す（可変長データ）
    (ctx) => ctx.items.map(item => `- ${item}`),
    
    // 条件付きコンテンツ
    (ctx) => ctx.items.length > 0 ? '処理開始' : null,
    
    // Elementを返す
    (ctx) => ({
      type: 'material',
      id: 'data',
      title: 'Input Data',
      content: ctx.items.join('\n')
    })
  ]
};
```

### SimpleDynamicContent（SubSection専用）

```typescript
const module: PromptModule<{ rules: string[] }> = {
  instructions: [
    {
      type: 'subsection',
      title: 'Rules',
      items: [
        '基本ルール:',
        // SimpleDynamicContent: 文字列配列を返す
        (ctx) => ctx.rules,
        // 条件付きで追加
        (ctx) => ctx.rules.length > 5 ? '※ ルールが多いため注意' : null
      ]
    }
  ]
};
```