# Moduler Prompt 完全ガイド

Moduler Promptは、AIプロンプトを構造化・再利用可能にするTypeScriptフレームワークです。このガイドでは、Moduler Promptの仕様と使用方法を体系的に解説します。

## 目次

1. [コア概念](#コア概念)
2. [アーキテクチャ](#アーキテクチャ)
3. [標準セクション仕様](#標準セクション仕様)
4. [Element型仕様](#element型仕様)
5. [DynamicContent仕様](#dynamiccontent仕様)
6. [createContext仕様](#createcontext仕様)
7. [コンパイル仕様](#コンパイル仕様)
8. [AIドライバー仕様](#aiドライバー仕様)
9. [構造化出力仕様](#構造化出力仕様)
10. [実装ガイド](#実装ガイド)
11. [設計原則とベストプラクティス](#設計原則とベストプラクティス)

## コア概念

### 基本的な処理フロー

```
PromptModule + Context → compile() → CompiledPrompt → AIDriver → QueryResult
```

### 3つの核心要素

#### PromptModule（プロンプトモジュール）
- **定義**: 再利用可能なプロンプトのテンプレート
- **特徴**: 静的に定義され、実行時変更不可
- **目的**: プロンプトの構造と指示を定義

#### Context（コンテキスト）
- **定義**: 実行時の動的データコンテナ
- **内容**: ユーザー入力、アプリケーション状態、外部データ
- **役割**: モジュールに動的な値を注入

#### CompiledPrompt（コンパイル済みプロンプト）
- **定義**: モジュールとコンテキストを結合した最終形
- **構造**: instructions、data、outputの3大セクション
- **用途**: AIドライバーへの入力

## アーキテクチャ

### 3大セクション構造

CompiledPromptは必ず以下の3つの大セクションに分類されます：

| 大セクション | 役割 | セキュリティ上の利点 | 含まれる内容 |
|------------|------|-------------------|------------|
| **instructions** | AIへの静的指示 | プロンプトインジェクション対策 | 目的、手法、ガイドライン |
| **data** | 動的データ | ユーザーデータを安全に分離 | 状態、入力、参考資料 |
| **output** | 出力定義 | 構造化出力の保証 | 形式指定、スキーマ |

この分離により、ユーザー入力が誤ってAIの指示として解釈されることを防ぎます。

### 標準セクションの分類マッピング

各標準セクションは、compile時に自動的に適切な大セクションに分類されます：

#### Instructions大セクション
| 標準セクション | セクションタイトル | 用途 |
|--------------|------------------|------|
| objective | 'Objective and Role' | AIの目的と役割定義 |
| terms | 'Term Explanations' | 専門用語の定義 |
| methodology | 'Processing Methodology' | 処理手法の指定 |
| instructions | 'Instructions' | 具体的な指示 |
| guidelines | 'Guidelines' | 制約とガイドライン |
| preparationNote | 'Response Preparation Note' | 応答準備の注意事項 |

#### Data大セクション
| 標準セクション | セクションタイトル | 用途 |
|--------------|------------------|------|
| state | 'Current State' | 現在の状態情報 |
| inputs | 'Input Data' | シンプルな入力データ |
| materials | 'Prepared Materials' | 構造化された参考資料 |
| chunks | 'Input Chunks' | 分割された大量データ |
| messages | 'Messages' | 対話履歴 |

#### Output大セクション
| 標準セクション | 用途 |
|--------------|------|
| cue | 出力開始の合図テキスト |
| schema | JSONスキーマによる出力形式定義 |

## 標準セクション仕様

### SectionContent型定義

各標準セクションには、以下の型で定義される要素を配置できます：

```typescript
type SectionContent<TContext> = (
  | string                        // プレーンテキスト
  | Element                       // 構造化要素
  | DynamicContent<TContext>      // 動的生成関数
)[];
```

### 配置可能な要素の詳細

#### 配列の基本的な扱い

標準セクションは**常に配列**として定義されます。配列の各要素は独立した行として処理されます。

| 配列の扱い | 動作 |
|----------|------|
| 静的配列 | 各要素が独立した行になる |
| 関数の戻り値（配列） | 自動的に展開される |
| null/undefined | スキップされる |
| ネストした配列 | 1階層のみ展開 |

#### 1. 文字列（string）
- **用途**: 静的なテキスト情報
- **処理**: そのまま1行として出力
- **配列での扱い**: 各文字列が独立した行

#### 2. Element型
- **用途**: 構造化されたデータ
- **処理**: 型に応じた特別な処理
- **配列での扱い**: 各Elementが独立した要素として処理
- **制約**: 静的に定義する必要がある

#### 3. DynamicContent関数
- **用途**: 実行時に動的に内容を生成
- **処理**: compile時にコンテキストを受け取り実行
- **戻り値**: 文字列、Element、配列、またはnull
- **配列での扱い**:
  - 文字列を返す → 1行として配置
  - 文字列配列を返す → 各要素が独立した行として展開
  - Element配列を返す → 各Elementが独立して配置
  - null/undefinedを返す → その要素はスキップ

### 各標準セクションの仕様

#### objective（目的）
- **役割**: AIの目的と役割を明確に定義
- **推奨内容**: 1-2文の明確な目的文
- **配置先**: Instructions大セクション

#### instructions（指示）
- **役割**: 具体的な処理指示
- **推奨内容**: 箇条書きの手順、SubSectionによる構造化
- **配置先**: Instructions大セクション

#### state（状態）
- **役割**: 現在のシステム状態を提供
- **概念**: state machineやstream processingにおけるstateの概念を意図
- **推奨内容**: タイムスタンプ、セッション情報、モード、処理状態
- **配置先**: Data大セクション

#### inputs（入力）
- **役割**: ユーザー入力や簡単なデータ
- **推奨内容**: 文字列形式の入力データ
- **配置先**: Data大セクション

#### materials（資料）
- **役割**: 参考資料や詳細データ
- **推奨内容**: MaterialElement形式の構造化データ
- **配置先**: Data大セクション

#### schema（スキーマ）
- **役割**: 出力形式の定義
- **推奨内容**: JSONElement形式のスキーマ定義
- **配置先**: Output大セクション

## Element型仕様

### Element型の階層

```typescript
type Element =
  | TextElement        // 単純テキスト
  | MessageElement     // 対話メッセージ
  | MaterialElement    // 参考資料
  | ChunkElement      // データチャンク
  | JSONElement       // JSON構造
  | SectionElement    // セクション（第1階層）
  | SubSectionElement // サブセクション（第2階層）
```

### 各Element型の詳細仕様

#### TextElement
```typescript
interface TextElement {
  type: 'text';
  content: string;
}
```
- **用途**: プレーンテキストの明示的な表現
- **処理**: contentをそのまま出力

#### MessageElement
```typescript
interface MessageElement {
  type: 'message';
  role: 'system' | 'assistant' | 'user';
  content: string;
}
```
- **用途**: 対話形式のメッセージ
- **処理**: ドライバーによってroleが解釈される

#### MaterialElement
```typescript
interface MaterialElement {
  type: 'material';
  id: string;        // 一意識別子
  title: string;     // 資料タイトル
  content: string;   // 資料内容
}
```
- **用途**: 構造化された参考資料
- **処理**: フォーマッターにより整形される

#### ChunkElement
```typescript
interface ChunkElement {
  type: 'chunk';
  content: string;
  partOf: string;    // データセット名
  index?: number;    // チャンク番号
  total?: number;    // 総チャンク数
}
```
- **用途**: 大量データの分割処理
- **処理**: 順序を保持して処理

#### JSONElement
```typescript
interface JSONElement {
  type: 'json';
  content: object | string;  // JSONオブジェクトまたは文字列
}
```
- **用途**: 構造化データ、出力スキーマ定義
- **処理**: schemaセクションではoutputSchemaとして使用

#### SectionElement
```typescript
interface SectionElement {
  type: 'section';
  title: string;
  items: (string | SubSectionElement)[];
}
```
- **用途**: 第1階層の構造化
- **制約**: 最大階層深度は2まで

#### SubSectionElement
```typescript
interface SubSectionElement {
  type: 'subsection';
  title: string;
  items: string[];  // 文字列のみ
}
```
- **用途**: 第2階層の構造化
- **制約**: itemsは文字列配列のみ、これ以上の入れ子不可

## DynamicContent仕様

### 型定義

```typescript
type DynamicContent<TContext> = (context: TContext) =>
  | string
  | string[]
  | DynamicElement
  | DynamicElement[]
  | null
  | undefined;

type DynamicElement =
  | TextElement
  | MessageElement
  | MaterialElement
  | ChunkElement
  | JSONElement;
  // SectionElement、SubSectionElementは生成不可
```

### 動作仕様

#### 戻り値の処理

| 戻り値 | 処理 |
|-------|------|
| string | そのまま文字列として配置 |
| string[] | 各要素を独立した行として展開 |
| DynamicElement | Elementとして配置 |
| DynamicElement[] | 各Elementを順番に配置 |
| null/undefined | 何も出力しない（スキップ） |

#### 実行タイミング
- compile関数の実行時に1回だけ実行される
- 実行時のコンテキストが引数として渡される
- エラーが発生した場合はコンパイルエラーとなる

### 重要な制約

1. **構造の静的定義**: SectionElement、SubSectionElementは生成できない
2. **実行回数**: 各DynamicContentは1回のみ実行
3. **副作用の禁止**: 純粋関数として実装すべき

## createContext仕様

### createContext関数の役割

createContextは、モジュールが必要とするコンテキストの**初期値**を定義する関数です。

```typescript
interface PromptModule<TContext> {
  createContext?: () => TContext;
  // ... 他のセクション
}
```

### 動作仕様

#### 基本的な流れ

1. モジュール定義時に`createContext`を定義
2. `createContext(module)`でコンテキストを生成
3. 必要に応じて値を更新
4. `compile(module, context)`に渡す

#### merge時の動作

複数のモジュールをmergeする場合、全てのcreateContextが実行され、結果がマージされます。同名プロパティは後のモジュールの値で上書きされます。

### 設計上の推奨事項

| 推奨事項 | 理由 |
|---------|------|
| 完全な初期値を定義 | 実行時エラーを防ぐ |
| 純粋関数として実装 | 予測可能な動作を保証 |
| 型定義との一致 | TypeScriptの型安全性を活用 |
| 副作用の回避 | テスタビリティの向上 |

### createContext省略時の動作

createContextが定義されていない場合：
- `createContext(module)`を呼ぶと`{}`（空オブジェクト）が返される
- `compile(module)`を引数なしで呼ぶと、コンテキストは`{}`として扱われる

## コンパイル仕様

### compile関数の動作

```typescript
function compile<TContext>(
  module: PromptModule<TContext>,
  context?: TContext
): CompiledPrompt
```

### コンパイルプロセス

1. **コンテキスト準備**
   - contextが未指定の場合、`createContext(module)`を実行して生成
   - 指定された場合はそのまま使用

2. **標準セクションの処理**
   - 各標準セクションをSectionElementに変換
   - 適切な大セクションに分類

3. **DynamicContent実行**
   - 全てのDynamicContent関数を実行
   - 戻り値を適切な形式に変換

4. **Element配置**
   - 3大セクションに要素を配置
   - 順序を保持

5. **メタデータ設定**
   - schemaセクションの最初のJSONElementをoutputSchemaに設定

### コンパイル結果の構造

```typescript
interface CompiledPrompt {
  instructions: Element[];  // 指示要素
  data: Element[];         // データ要素
  output: Element[];       // 出力要素
  metadata?: {
    outputSchema?: object; // 構造化出力スキーマ
  };
}
```

## AIドライバー仕様

### ドライバーインターフェース

```typescript
interface AIDriver {
  query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult>;
  streamQuery(prompt: CompiledPrompt, options?: QueryOptions): Promise<StreamResult>;
  close(): Promise<void>;
}
```

### QueryResult型

```typescript
interface QueryResult {
  content: string;              // テキストレスポンス
  structuredOutput?: unknown;   // 構造化出力
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}
```

### StreamResult型

```typescript
interface StreamResult {
  stream: AsyncIterable<string>;  // ストリーム
  result: Promise<QueryResult>;   // 最終結果
}
```

### ドライバー実装状況

| ドライバー | プロバイダー | ストリーミング | 構造化出力 | 用途 |
|-----------|------------|--------------|----------|------|
| OpenAIDriver | OpenAI | ✅ | ✅ | GPT-4, GPT-3.5 |
| AnthropicDriver | Anthropic | ✅ | ✅ | Claude |
| VertexAIDriver | Google | ✅ | ✅ | Gemini |
| MlxDriver | ローカル | ✅ | ✅ | Apple Silicon |
| OllamaDriver | ローカル | ✅ | ❌ | 各種ローカルLLM |
| TestDriver | - | ✅ | ✅ | テスト用 |

## 構造化出力仕様

### 基本的な仕組み

1. **スキーマ定義**: schemaセクションにJSONElementを配置
2. **自動設定**: compile時にmetadata.outputSchemaに設定
3. **ドライバー処理**: 各ドライバーが独自の方法で実装
4. **結果取得**: QueryResult.structuredOutputから取得

### 実装パターン

#### ネイティブサポート型
- OpenAI: response_format APIを使用
- VertexAI: responseMimeType/responseSchemaを使用

#### JSON抽出型
- Anthropic: プロンプト指示 + extractJSON
- MlxDriver: レスポンスからextractJSON
- TestDriver: モックデータからextractJSON

### エラーハンドリング

structuredOutputの値：
- **undefined**: スキーマ未指定または抽出失敗
- **object/array**: 成功（スキーマ準拠のデータ）

## 実装ガイド

### 基本的な実装パターン

#### パターン1: シンプルな静的モジュール
```typescript
const module: PromptModule = {
  objective: ['目的'],
  instructions: ['指示']
};
```

#### パターン2: コンテキスト付きモジュール
```typescript
const module: PromptModule<Context> = {
  createContext: () => ({ /* 初期値 */ }),
  state: [(ctx) => /* 動的生成 */]
};
```

#### パターン3: 構造化出力モジュール
```typescript
const module: PromptModule = {
  schema: [{ type: 'json', content: /* JSONSchema */ }]
};
```

### モジュールの合成と責任分離

#### merge関数の仕様

```typescript
function merge<T>(...modules: PromptModule<T>[]): PromptModule<T>
```

merge関数は複数のモジュールを合成し、**異なる責務を持つモジュールを組み合わせる**ための機能です。

#### 合成時の動作

| 要素 | 合成ルール | 例 |
|------|----------|-----|
| 標準セクション | 配列として結合（順序保持） | `['A'] + ['B'] → ['A', 'B']` |
| createContext | オブジェクトマージ（後勝ち） | `{a:1} + {a:2,b:3} → {a:2,b:3}` |
| 同名SubSection | itemsが結合される | 両方のitemsが保持される |

#### 責任分離の設計パターン

責務ごとにモジュールを分離し、mergeで合成する設計：

| モジュール | 責務 | 含む要素 |
|-----------|------|---------|
| stateModule | 状態管理 | state, createContext |
| processingModule | データ処理 | instructions, materials |
| outputModule | 出力形式 | schema, cue |
| validationModule | 検証ルール | guidelines, terms |

これらを`merge(stateModule, processingModule, outputModule)`のように合成して使用します。

#### 合成の利点

1. **単一責任の原則**: 各モジュールが1つの明確な責務を持つ
2. **再利用性**: 共通モジュールを複数のワークフローで利用可能
3. **テスタビリティ**: 各モジュールを独立してテスト可能
4. **保守性**: 責務ごとに分離されているため変更が容易

#### 重要な注意点

- **上書きではない**: merge は配列の結合であり、上書きではない
- **順序の保持**: モジュールの引数順序が結果の順序に影響
- **createContextの扱い**: 同名プロパティは後のモジュールの値で上書き
- **schemaの結合**: 複数のJSONElementが存在する場合、最初のものがoutputSchemaとして使用

## 設計原則とベストプラクティス

### 基本原則

#### 1. 静的定義の原則
- PromptModuleは関数外で定義
- ローカル変数を直接参照しない
- 動的な値はコンテキスト経由

#### 2. セキュリティの原則
- ユーザーデータはdataセクションに隔離
- 指示とデータを明確に分離
- プロンプトインジェクションを防ぐ設計

#### 3. 型安全性の原則
- 明確な型定義を使用
- any型を避ける
- コンテキスト型を適切に定義

### よくある間違いと対策

| 間違い | 問題点 | 正しい方法 |
|-------|--------|-----------|
| 関数内でモジュール定義 | ローカル変数を参照 | 静的定義＋コンテキスト使用 |
| ユーザーデータを指示に混入 | インジェクションリスク | dataセクションに分離 |
| スプレッド構文で合成 | 配列が上書きされる | merge関数を使用 |
| any型の使用 | 型安全性の欠如 | 明確な型定義 |
| createContext未定義 | 初期値がない | 完全な初期値を定義 |

### チェックリスト

実装時の確認事項：

- [ ] PromptModuleを関数外で静的に定義しているか
- [ ] ローカル変数を直接参照していないか
- [ ] 動的な値はコンテキスト経由で渡しているか
- [ ] ユーザーデータをdataセクションに隔離しているか
- [ ] 型定義を明確にしているか
- [ ] エラーハンドリングを実装しているか
- [ ] structuredOutputの有無を確認しているか

## パッケージ構成

| パッケージ | 役割 | 主要機能 |
|-----------|------|---------|
| @moduler-prompt/core | コア機能 | 型定義、compile、merge |
| @moduler-prompt/driver | AIドライバー | 各種AI API接続 |
| @moduler-prompt/utils | ユーティリティ | JSON抽出、フォーマッター |
| @moduler-prompt/process | 処理支援 | ストリーム処理、チャンク管理 |

## まとめ

Moduler Promptは、以下の特徴により安全で保守性の高いAIプロンプトシステムを実現します：

1. **構造化**: 3大セクション構造による明確な役割分担
2. **型安全**: TypeScriptによる静的型検証
3. **セキュリティ**: データと指示の分離によるインジェクション対策
4. **再利用性**: モジュール化による効率的な開発
5. **柔軟性**: 様々なAIモデルへの統一的なインターフェース

これらの仕様を理解し、設計原則に従うことで、堅牢なAIアプリケーションを構築できます。