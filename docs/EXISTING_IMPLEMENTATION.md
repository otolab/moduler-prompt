# 既存実装の分析

## 概要

`refs/`ディレクトリには、モジュラープロンプトフレームワークの既存実装が含まれています。主に`core`と`driver`の2つのパッケージから構成されています。

## パッケージ構成

### @moduler-prompt/core

プロンプトモジュールの定義、マージ、ビルド機能を提供するコアパッケージです。

#### 主要な型定義（types.ts）

##### 基本型
- **Message**: 会話メッセージ（role、content、usage等）
- **Chunk**: 処理対象データの単位（partOf、content、usage）
- **Material**: 参考資料（id、title、content、usage）
- **Context**: 実行時コンテキスト（state、materials、chunks、messages等）

##### プロンプト構造
- **PromptModule**: セクション名をキーとしたプロンプト定義
- **ChunkItem**: 構造化されたコンテンツアイテム
- **SubSectionPrompt**: サブセクション定義
- **Prompt**: ビルド済みプロンプト（instructions、data、output）

#### セクション定義

```typescript
const basicPromptSections = [
  // Instructions セクション
  { name: 'objective', type: 'instructions', title: 'Objective and Role' },
  { name: 'terms', type: 'instructions', title: 'Term Explanations' },
  { name: 'instructions', type: 'instructions', title: 'Instructions' },
  { name: 'advices', type: 'instructions', title: 'Guidelines' },
  { name: 'guidlines', type: 'instructions', title: 'Guidelines' }, // typo互換
  { name: 'preparationNote', type: 'instructions', title: 'Response Preparation Note' },
  
  // Data セクション
  { name: 'state', type: 'data', title: 'Current State' },
  { name: 'materials', type: 'data', title: 'Prepared Materials' },
  { name: 'chunks', type: 'data', title: 'Input Chunks' },
  { name: 'messages', type: 'data', title: 'Messages' },
  
  // Output セクション
  { name: 'cue', type: 'output', title: 'Output' }
];
```

#### 主要関数（index.ts）

##### mergePrompts
複数のプロンプトモジュールをマージします。同名のセクションは配列として結合されます。

```javascript
const merged = mergePrompts(module1, module2, module3);
```

##### buildPrompt
プロンプトモジュールとコンテキストから実際のプロンプトを構築します。

```javascript
const prompt = buildPrompt(promptModule, context);
```

##### generatePromptText
Prompt型からテキスト形式のプロンプトを生成します。

```javascript
const text = generatePromptText(prompt);
```

##### generatePromptMessages
Prompt型からChat API互換のメッセージ配列を生成します。

```javascript
const messages = generatePromptMessages(prompt);
```

#### 事前定義モジュール（prompts/）

##### dialogue.ts
- `dialogueBase`: 基本的な対話環境
- `firstOfTwoPassResponse`: 2パス応答の1回目
- `secondOfTwoPassResponse`: 2パス応答の2回目
- `materialBasedResponse`: 資料ベースの応答
- `withTalkState`: 会話状態管理

##### material.ts
- `withMaterials`: 資料データの組み込み
- `answerWithReferences`: 参照付き回答

##### stream-processing.ts
- `chunkStreamProcessing`: チャンク単位のストリーム処理
- `rangedChunkStreamProcessing`: 範囲指定付きストリーム処理

##### summarize.ts
- `chunkSummarize`: チャンクの要約
- `togetherSummarize`: 複数チャンクの統合要約

### @moduler-prompt/driver

各種生成AIモデルへのドライバ実装を提供します。

#### インターフェース定義（types.ts）

```typescript
interface DriverInterface<DriverOptions> {
  readonly distributer: string;
  getModelSpec: GetModelSpec;
  close: Close | null;
  query: Query<DriverOptions> | null;
  streamQuery: StreamQuery<DriverOptions> | null;
  completion: Completion<DriverOptions> | null;
}
```

#### 実装済みドライバ

##### OpenAI API系（openai-api/）
- **OpenAIDriver**: OpenAI公式API
- **AzureDriver**: Azure OpenAI Service
- **OllamaDriver**: Ollama（ローカルLLM）

##### その他
- **VertexAIDriver**: Google Vertex AI
- **MLXDriver**: Apple MLXフレームワーク用

#### モデル管理（models.ts、model-manager.ts）

モデルのスペック（コンテキスト長、料金等）を管理：

```typescript
interface ModelSpec {
  model: string;
  contextLength: number;
  outputLength?: number;
  pricePerMillionInputTokens?: number;
  pricePerMillionOutputTokens?: number;
}
```

## ユーティリティ機能

### collect.ts
ファイルやディレクトリから資料を収集する機能：

```javascript
const materials = await collectFiles(patterns, options);
```

### chunk-formats.ts
ChunkItemを各種形式にフォーマットする機能：

```javascript
const text = formatChunkItem(chunkItem);
const message = formatChunkMessage(chunkItem);
```

## 既知の問題点

### 型の不整合
- ContextualItem関数の戻り値型が複雑（`string | ChunkItem[] | null | undefined`）
- SubSectionPrompt内でのContextualItem使用時の挙動が不明確

### 命名の不統一
- `guidlines`のtypo（正しくは`guidelines`）が後方互換性のため残存
- `advices`と`guidelines`が同じ出力タイトルを持つ

### 実装の不完全性
- attachment処理にバグあり（content重複）
- セクション定義がハードコード（moduleから提供できない）
- エラーハンドリングが不十分

## 移行時の考慮事項

新しいモノレポ構造への移行時には以下を考慮：

1. **型定義の整理**: 不整合を解消し、より厳密な型定義へ
2. **命名規則の統一**: typoの修正と後方互換性の提供方法
3. **拡張性の向上**: セクション定義の動的化
4. **エラーハンドリング**: 適切なバリデーションとエラーメッセージ
5. **テストカバレッジ**: 既存のテストケースの移植と拡充

## 再利用可能な部分

以下の部分は新実装でも活用可能：

1. **基本的なデータ構造**: Message、Chunk、Material等の型定義
2. **マージロジック**: プロンプトモジュールのマージ処理
3. **事前定義モジュール**: dialogue、material等の実用的なモジュール
4. **ドライバインターフェース**: 統一されたAPIアクセス方法
5. **フォーマット処理**: チャンクアイテムのフォーマット機能