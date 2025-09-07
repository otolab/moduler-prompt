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

- 独立したモジュールとして定義
- モジュール同士の合成が可能
- コンテキストベースの動的コンテンツ生成

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
モジュール定義
    ↓
モジュールマージ (merge)
    ↓
コンテキスト生成 (createContext)
    ↓
コンパイル (compile)
    ↓
フォーマット (formatPrompt) ※utilsパッケージ
    ↓
ドライバー実行 (driver.query)
    ↓
結果出力
```

## 型定義

### PromptModule

プロンプトモジュールの基本型:

```typescript
interface PromptModule<TContext = any> {
  // コンテキスト生成
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
type DynamicContent<TContext> = (context: TContext) => 
  DynamicElement[] | DynamicElement | null;

// 生成可能な要素（構造要素は除外）
type DynamicElement = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement;
```

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

### 2. compile - プロンプトのコンパイル

モジュールとコンテキストから最終的なプロンプトを生成:

```typescript
const compiled = compile(module, context);
// → { instructions: Element[], data: Element[], output: Element[] }
```

**コンパイル処理:**
1. 標準セクションを自動的にSectionElementに変換
2. DynamicContentを実行して要素を生成
3. セクション内の要素を並び替え（通常要素 → サブセクション）
4. Instructions/Data/Outputカテゴリに分類

### 3. createContext - コンテキスト生成

モジュールからコンテキストを生成:

```typescript
const context = createContext(module);
```

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
const myModule: PromptModule<MyContext> = {
  createContext: () => ({ /* 初期コンテキスト */ }),
  
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
    (ctx) => ({
      type: 'text',
      content: `現在の状態: ${ctx.state}`
    })
  ]
};
```

### モジュールの合成と実行

```typescript
// モジュールを合成
const combined = merge(baseModule, featureModule);

// コンテキストを生成
const context = createContext(combined);

// コンパイル
const prompt = compile(combined, context);

// フォーマットしてドライバーで実行
const result = await driver.query(prompt);
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