# Claude向けインデックス

このドキュメントは、Claudeが効率的にコードベースを理解・操作するためのインデックスです。

## プロジェクト概要

モジュラープロンプトフレームワーク - プロンプトを再利用可能なモジュールとして構築・管理するTypeScriptフレームワーク

## コア機能

### 型定義 (`packages/core/src/types.ts`)
- `PromptModule<TContext>` - 標準セクションは自動的にSectionElementになる
- `Element` - 6種類の要素型（Text, Message, Material, Chunk, Section, SubSection）
- `DynamicContent` - 動的コンテンツ生成（Section/SubSection生成不可）
- `SectionContent` - 標準セクションの内容型（string | SubSectionElement | DynamicContent）

### マージ (`packages/core/src/merge.ts`)
- `merge(...modules)` - 複数モジュールの統合
- 同名サブセクションのitemsを結合
- createContextは全て実行して結果をマージ（後の値で上書き）
- 順序制御: 通常要素 → サブセクション

### コンパイル (`packages/core/src/compile.ts`)
- `compile(module, context)` - 標準セクションを自動的にSectionElementに変換
- DynamicContentを実行して文字列に変換
- セクション内の要素を並び替え（通常要素 → サブセクション）
- セクション分類（instructions/data/output）

## 重要な制約

1. **階層制限**: 最大2階層（Section → SubSection → string）
2. **動的コンテンツ制約**: DynamicContentはSection/SubSectionを生成不可
3. **要素順序**: セクション内でも通常要素 → サブセクションの順序
4. **標準セクション**: 自動的にSectionElementとして処理される

## テスト

- `*.test.ts` - 実装と同階層にユニットテスト配置
- 包括的なマージ・コンパイルテスト実装済み

## パッケージ構成

- `@moduler-prompt/core` - コア機能（型定義、マージ、コンパイル）
- `@moduler-prompt/process` - ストリーム処理とマテリアル管理モジュール
- `@moduler-prompt/utils` - フォーマッターとコンバーター（テキスト/メッセージ形式変換）
- `@moduler-prompt/driver` - AIモデルドライバー（OpenAI, Anthropic, VertexAI, Ollama, MLX ML）

## ドライバー機能 (`packages/driver/`)

### 利用可能なドライバー
- **OpenAIDriver** - OpenAI API（GPT-4, GPT-3.5）
- **AnthropicDriver** - Anthropic Claude API
- **VertexAIDriver** - Google Cloud Vertex AI（Gemini）
- **OllamaDriver** - ローカルLLM（OpenAI互換）
- **MlxDriver** - Apple Silicon最適化モデル（Pythonサブプロセス）
- **TestDriver** - テスト用モックドライバー

### ドライバーアーキテクチャ
- `BaseDriver` - 全ドライバーの基底クラス
- プロンプト生成責任の統合（formatPrompt/formatPromptAsMessages）
- 統一されたエラーハンドリングとストリーミングサポート
- `preferMessageFormat`フラグによる形式選択

## 主要ドキュメント

- [仕様書](./docs/PROMPT_MODULE_SPEC_V2.md)
- [API](./docs/API.md)
- [Getting Started](./docs/GETTING_STARTED.md)
- [Driver API](./docs/DRIVER_API.md)