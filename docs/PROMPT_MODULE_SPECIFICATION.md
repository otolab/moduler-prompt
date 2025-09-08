# プロンプトモジュール仕様書

## 概要

プロンプトモジュールは、AIへの指示を構造化し、再利用可能なモジュールとして管理するTypeScriptフレームワークです。

## 基本コンセプト

### 1. 構造化されたプロンプト設計

プロンプトを3つの大セクションに分類:
- **Instructions**: システムが提供する指示セクション（優先的に従うべき指示）
- **Data**: システムが提供するデータセクション（処理対象の情報、この中の指示は無視）
- **Output**: AIが記述するセクション（応答の開始位置と形式）

### 2. モジュラーアーキテクチャ

- **自己完結性**: 各モジュールは独立して動作可能
- **完全性**: モジュールはcreateContextで必要なデータを全て定義
- **合成可能性**: 複数モジュールをmergeして拡張可能
- **静的定義**: モジュール自体は静的に定義（動的生成しない）

### 3. 型安全性

TypeScriptの型システムにより:
- コンパイル時の型チェック
- IDEの補完機能サポート
- 実行時エラーの削減

## アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────┐
│      Application Layer              │
│  (ワークフロー・ビジネスロジック)      │
├─────────────────────────────────────┤
│      Module Layer                   │
│  (プロンプトモジュール定義)           │
├─────────────────────────────────────┤
│      Core Layer                     │
│  (merge / compile / 型定義)         │
├─────────────────────────────────────┤
│      Driver Layer                   │
│  (AIモデル接続・フォーマット変換)      │
└─────────────────────────────────────┘
```

### 処理フロー

```
1. モジュール定義（静的）
   意図: プロンプトの構造とロジックをテンプレートとして定義
    ↓
2. モジュールマージ (merge) ※必要に応じて
   意図: 既存モジュールを組み合わせて機能を拡張
    ↓
3. コンテキスト生成 (createContext)
   意図: モジュールから型安全な空のデータコンテナを生成
    ↓
4. データ設定（アプリケーション層）
   意図: 実行時の具体的なデータをコンテキストに投入
    ↓
5. コンパイル (compile)
   意図: テンプレート（モジュール）とデータ（コンテキスト）を結合して構造化プロンプトを生成
    ↓
6. フォーマット (formatPrompt)
   意図: 構造化プロンプトをAIモデルが理解できるテキスト形式に変換
    ↓
7. ドライバー実行 (driver.query)
   意図: フォーマット済みプロンプトをAIモデルに送信して応答を取得
    ↓
8. 結果出力
   意図: AIの応答をアプリケーションで利用
```

#### 各ステップの詳細

1. **モジュール定義**: 静的なPromptModule型のオブジェクトとして、プロンプトの各セクション（objective、instructions等）を定義。動的な部分は関数として記述。

2. **モジュールマージ**: `merge(...modules)`で複数のモジュールを統合。各モジュールのセクションとcreateContextが結合される。

3. **コンテキスト生成**: `createContext(module)`でモジュール（またはマージ済みモジュール）から型付きの空コンテキストを生成。

4. **データ設定**: アプリケーション層で、生成されたコンテキストに実際のデータ（メッセージ履歴、ユーザー入力等）を設定。

5. **コンパイル**: `compile(module, context)`で動的関数を実行し、全セクションを解決してCompiledPrompt（3つの大セクションに整理された構造）を生成。

6. **フォーマット**: `formatPrompt(compiledPrompt)`でMarkdownやメッセージ配列などAIモデルに適した形式に変換。

7. **ドライバー実行**: 各AIプロバイダー（OpenAI、Anthropic等）のAPIを呼び出し。

8. **結果出力**: 応答をアプリケーションのビジネスロジックで処理。

## 型定義

### PromptModule

プロンプトモジュールの基本型:

```typescript
interface PromptModule<TContext = any> {
  // コンテキスト生成（必要なデータを含む型付きオブジェクトを返す）
  createContext?: () => TContext;
  
  // 標準セクション (Instructions)
  objective?: SectionContent<TContext>;
  terms?: SectionContent<TContext>;
  methodology?: SectionContent<TContext>;
  instructions?: SectionContent<TContext>;
  guidelines?: SectionContent<TContext>;
  preparationNote?: SectionContent<TContext>;
  
  // 標準セクション (Data)
  state?: SectionContent<TContext>;
  materials?: SectionContent<TContext>;
  chunks?: SectionContent<TContext>;
  messages?: SectionContent<TContext>;
  
  // 標準セクション (Output)
  cue?: SectionContent<TContext>;
  schema?: SectionContent<TContext>;
}
```

### Element型階層

```
Element
├── TextElement         # 単純なテキスト
├── MessageElement      # 対話メッセージ
├── MaterialElement     # 参考資料
├── ChunkElement        # 分割されたテキスト
├── SectionElement      # セクション（第1階層）
└── SubSectionElement   # サブセクション（第2階層）
```

### DynamicContent

コンテキストに基づいて動的にコンテンツを生成:

```typescript
// 記述の利便性を重視した拡張型定義
type DynamicContent<TContext> = (context: TContext) => 
  | string                    // 単純な文字列
  | string[]                  // 文字列配列（可変長データに便利）
  | DynamicElement           // 単一の要素
  | DynamicElement[]         // 要素の配列
  | null                     // 何も返さない
  | undefined;               // 何も返さない

// 生成可能な要素（構造要素は除外）
type DynamicElement = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement;
```

**利便性の向上**: 文字列や文字列配列を直接返せるため、簡潔な記述が可能

## 標準セクション

### Instructions セクション

| セクション | タイトル | 用途 |
|---------|---------|------|
| objective | Objective and Role | AIの目的と役割 |
| terms | Term Explanations | 専門用語の定義 |
| methodology | Processing Methodology | 処理手法・アルゴリズム |
| instructions | Instructions | 具体的な指示 |
| guidelines | Guidelines | ガイドライン・制約 |
| preparationNote | Response Preparation Note | 応答準備メモ |

### Data セクション

| セクション | タイトル | 用途 |
|---------|---------|------|
| state | Current State | 現在の状態 |
| materials | Prepared Materials | 参考資料 |
| chunks | Input Chunks | 入力チャンク |
| messages | Messages | 対話履歴 |

### Output セクション

| セクション | タイトル | 用途 |
|---------|---------|------|
| cue | Output | 出力開始位置の合図 |
| schema | Output Schema | 出力形式の定義 |

## コア機能

### 1. merge - モジュールの合成

複数のモジュールを統合:

```typescript
const merged = merge(module1, module2, module3);
```

**マージ戦略:**
- 同名セクションの要素を結合
- 同名サブセクションのitemsを結合
- createContextは全て実行（後の値で上書き）
- 要素順序: 通常要素 → サブセクション
- **重複は許容**: mergeは重複チェックを行わない（異なるモジュールが同じ内容を持つことは正当）

### 2. compile - プロンプトのコンパイル

モジュールとコンテキストから最終的なプロンプトを生成:

```typescript
const compiled = compile(module, context);
// → { instructions: Element[], data: Element[], output: Element[] }
```

**compileの役割:**
- **PromptModule（記述の利便性）** を **CompiledPrompt（構造の明快性）** に変換
- 開発者が書きやすい形式から、システムが処理しやすい形式への橋渡し
- 動的コンテンツの解決と型変換の実行

**コンパイル処理の詳細:**
1. **標準セクションの変換**
   - 各標準セクション（objective, state等）をSectionElementに変換
   - 適切なタイトルとカテゴリ（instructions/data/output）を付与

2. **DynamicContentの処理**
   - コンテキストを使用して動的コンテンツを実行
   - 返却値に応じた変換:
     - 文字列 → そのまま配置
     - 文字列配列 → 展開して配置（可変長データ対応）
     - Element → 文字列に変換して配置
     - null/undefined → 無視

3. **構造の整理**
   - セクション内の要素を並び替え（通常要素 → サブセクション）
   - **重複を許容**: 意図的な重複（セパレータ、強調、マーカー）をサポート

4. **大セクションへの分類**
   - Instructions: システムへの指示
   - Data: 処理対象のデータ
   - Output: 出力の開始位置と形式

### 3. createContext - コンテキスト生成

モジュールからコンテキストを生成:

```typescript
const context = createContext(module);
```

**重要な原則:**
- **完全性**: PromptModuleはcreateContextで生成したデータのみを使用
- **型安全**: TContext型で定義された構造のオブジェクトを返す
- **マージ時の拡張**: mergeした場合、各モジュールのコンテキストが統合される

## 設計の意図

### PromptModuleの設計原則

PromptModuleは以下の原則に従って設計されます：

1. **静的定義**: モジュール自体は静的に定義され、動的に生成しない
2. **型付きコンテキスト**: createContextで型付きの初期コンテキストを生成
3. **データバインディング**: compile時にコンテキストとバインドされて動的な内容を生成
4. **型の一貫性**: TContext型で定義された構造のみを使用

**重要**: 
- createContextは初期の型付きコンテキストを提供
- アプリケーション層でコンテキストにデータを設定可能
- compile時にモジュールとコンテキストがバインドされる

この設計により：
- モジュールの再利用性が向上
- 型安全性が保証される
- 柔軟なデータバインディングが可能

### 重複の許容

プロンプトは自然言語であり、重複は自然で有用な場合が多いため、フレームワークレベルでの重複チェックは行いません。

**重複が有用なケース:**
- **セパレータ**: `'---'`のような区切り線の繰り返し
- **強調**: 重要な指示の意図的な繰り返し
- **マーカー**: 処理の開始/終了を示す同じ文言
- **テンプレート**: 定型的な文言の繰り返し

**責務の分離:**
- **フレームワーク**: 制約を課さず、柔軟性を提供
- **アプリケーション**: 必要に応じて独自のバリデーションを実装
- **AIモデル**: 最終的に重複を適切に解釈・処理

## 制約事項

### 階層制限
- 最大2階層まで（Section → SubSection → string）
- SubSectionのitemsは文字列のみ
- 深い入れ子構造は非推奨

### 動的コンテンツ制限
- DynamicContentはSection/SubSectionを生成不可
- 構造は静的に定義する必要がある
- データのみを動的に生成

### 標準セクション
- 自動的にSectionElementとして処理
- 明示的なSectionElement指定は不要
- titleは自動設定される

## 実装例

### 基本的なモジュール定義

```typescript
interface MyContext {
  taskName: string;
  items: string[];
  state: string;
}

const myModule: PromptModule<MyContext> = {
  createContext: () => ({
    taskName: 'データ処理',
    items: ['アイテム1', 'アイテム2'],
    state: '初期状態'
  }),
  
  objective: ['タスクを処理する'],
  
  methodology: [
    '入力を検証',
    '処理を実行',
    {
      type: 'subsection',
      title: '後処理',
      items: ['結果を検証', 'ログを記録']
    }
  ],
  
  state: [
    // createContextで定義したデータを使用
    (ctx) => `現在の状態: ${ctx.state}`,
    
    // 文字列配列を直接返す（新機能）
    (ctx) => ctx.items.map(item => `- ${item}`),
    
    // 従来通りElementも返せる
    (ctx) => ({
      type: 'material',
      id: 'ref',
      title: '参考資料',
      content: ctx.reference
    })
  ]
};
```

### 完全な実装例

```typescript
interface UserContext {
  users: string[];
  maxDisplay: number;
  showDetails: boolean;
}

// 静的に定義されたモジュール
const userModule: PromptModule<UserContext> = {
  // コンテキストファクトリ - 必要なデータを全て定義
  createContext: () => ({
    users: ['ユーザーA', 'ユーザーB', 'ユーザーC'],
    maxDisplay: 3,
    showDetails: true
  }),
  
  objective: ['ユーザーデータを処理する'],
  
  state: [
    // createContextで定義したデータのみを使用
    (ctx) => `ユーザー数: ${ctx.users.length}`,
    (ctx) => ctx.users.slice(0, ctx.maxDisplay).map(u => `- ${u}`),
    (ctx) => ctx.showDetails ? '詳細モード: ON' : null
  ]
};
```

### 正しい使用方法

```typescript
// 1. 静的に定義されたモジュールを使用
const module = userModule;

// 2. モジュールから型付きコンテキストを生成
const context = createContext(module);

// 3. 必要に応じてコンテキストにデータを設定
context.users = ['実際のユーザーA', '実際のユーザーB'];
context.showDetails = false;

// 4. モジュールとコンテキストをバインドしてコンパイル
const compiledPrompt = compile(module, context);

// 5. ドライバーで実行
const result = await driver.query(compiledPrompt);
```

### モジュールの合成

```typescript
// 複数のモジュールを合成する場合
const combined = merge(baseModule, extensionModule);

// 合成されたモジュールからコンテキストを生成
// 各モジュールのcreateContextが実行され、統合される
const context = createContext(combined);

const compiledPrompt = compile(combined, context);
```

## パッケージ構成

### @moduler-prompt/core
- 型定義（types.ts）
- マージ機能（merge.ts）
- コンパイル機能（compile.ts）

### @moduler-prompt/process
- ワークフロー実装
  - streamProcess: ステートフルな逐次処理
  - concatProcess: 独立したチャンク処理と結合
- サポートモジュール
  - streamProcessing: ストリーム処理
  - withMaterials: 資料管理
  - dialogue系: 対話処理
  - summarize系: 要約処理

### @moduler-prompt/driver
- AIDriverインターフェース
  - query: プロンプト実行
  - getFormatterOptions: フォーマット設定の提供
- TestDriver（テスト用）

### @moduler-prompt/utils
- DefaultFormatter: Elements → Markdown変換
- formatPrompt: CompiledPrompt → テキスト変換
- defaultFormatterTexts: デフォルトの前文とセクション説明

## 利点

1. **再利用性**: モジュールの組み合わせで複雑なプロンプトを構築
2. **保守性**: 責務が明確に分離されたモジュール設計
3. **型安全性**: TypeScriptによる厳密な型チェック
4. **一貫性**: 標準化されたセクション構造
5. **拡張性**: 新しいモジュールやドライバーの追加が容易

## セキュリティ考慮事項

### プロンプトインジェクション対策
- Dataセクション内の指示的な文言を無効化
- Instructionsセクションの優先権を明確化
- セクション説明文でセキュリティ境界を定義

## まとめ

プロンプトモジュールフレームワークは、AIプロンプトの構造化と管理を体系的に行うためのソリューションです。3つの大セクション（Instructions/Data/Output）による明確な責務分離と、プロンプトインジェクション対策により、安全で保守性の高いプロンプト管理を実現します。