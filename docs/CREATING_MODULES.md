# プロンプトモジュールの作り方

## 概要

プロンプトモジュールの作成方法について解説する。モジュールは再利用可能なプロンプトのテンプレートとして設計される。

## 基本構造

### PromptModule型

```typescript
interface PromptModule<TContext = any> {
  // コンテキスト生成関数
  createContext?: () => TContext;
  
  // 標準セクション
  objective?: SectionContent<TContext>;
  instructions?: SectionContent<TContext>;
  state?: SectionContent<TContext>;
  materials?: SectionContent<TContext>;
  // ... その他のセクション
}
```

## モジュール作成の手順

### 1. コンテキスト型の定義

モジュールが使用するデータ構造を定義：

```typescript
interface MyContext {
  items: string[];
  currentState: string;
  options?: {
    verbose: boolean;
  };
}
```

### 2. モジュールの実装

```typescript
const myModule: PromptModule<MyContext> = {
  // コンテキストの初期値を定義
  createContext: () => ({
    items: [],
    currentState: 'ready',
    options: { verbose: false }
  }),
  
  // 静的な指示
  objective: ['データを処理して結果を返す'],
  
  // 動的な内容（DynamicContent）
  state: [
    (ctx) => `現在の状態: ${ctx.currentState}`,
    (ctx) => ctx.items.length > 0 ? `処理対象: ${ctx.items.length}件` : null
  ],
  
  // サブセクション
  instructions: [
    '以下の手順で処理を実行：',
    {
      type: 'subsection',
      title: 'Processing Steps',
      items: [
        'データの検証',
        (ctx) => ctx.options?.verbose ? 'デバッグ情報を出力' : null,
        '結果の生成'
      ]
    }
  ]
};
```

## DynamicContent（動的コンテンツ）

### 基本的な使い方

コンテキストに基づいて内容を生成する関数：

```typescript
type DynamicContent<TContext> = (context: TContext) => 
  | string                    // 単純な文字列
  | string[]                  // 文字列配列
  | DynamicElement           // Element
  | DynamicElement[]         // Element配列
  | null                     // 何も返さない
  | undefined;               // 何も返さない
```

### 実装例

```typescript
const module: PromptModule<{ data: any[] }> = {
  state: [
    // 条件付きコンテンツ
    (ctx) => ctx.data.length > 0 ? 'データあり' : 'データなし',
    
    // 配列の展開
    (ctx) => ctx.data.map((d, i) => `${i + 1}. ${d.name}`),
    
    // Element生成
    (ctx) => ({
      type: 'material',
      id: 'summary',
      title: 'データサマリー',
      content: JSON.stringify(ctx.data, null, 2)
    })
  ]
};
```

## 標準セクション

### Instructions（指示）セクション

| セクション | 用途 |
|---------|------|
| objective | AIの目的と役割 |
| instructions | 具体的な指示 |
| guidelines | ガイドライン・制約 |
| methodology | 処理手法 |
| terms | 専門用語の定義 |
| preparationNote | 応答準備メモ |

### Data（データ）セクション

| セクション | 用途 |
|---------|------|
| state | 現在の状態 |
| materials | 参考資料 |
| chunks | 入力データ |
| messages | 対話履歴 |

### Output（出力）セクション

| セクション | 用途 |
|---------|------|
| cue | 出力開始の合図 |
| schema | 出力形式の定義 |

## モジュールの合成

### merge関数

複数のモジュールを組み合わせて新しいモジュールを作成：

```typescript
import { merge } from '@moduler-prompt/core';

const baseModule: PromptModule = {
  objective: ['基本的な処理']
};

const extensionModule: PromptModule = {
  guidelines: ['追加のガイドライン']
};

// モジュールを合成
const combined = merge(baseModule, extensionModule);
```

### 合成時の動作

- 同名セクションの要素は配列として結合
- createContextは各モジュールの結果をマージ
- 重複は許容される（意図的な繰り返しをサポート）

## ベストプラクティス

### 1. 単一責任の原則

1つのモジュールは1つの明確な目的を持つ：

```typescript
// Good: 特定の機能に特化
const summaryModule: PromptModule = {
  objective: ['テキストを要約する'],
  instructions: ['重要なポイントを抽出', '簡潔にまとめる']
};

// Bad: 複数の責任を持つ
const complexModule: PromptModule = {
  objective: ['要約と翻訳と分析を行う'],
  // 複雑すぎる...
};
```

### 2. 型安全性の確保

TypeScriptの型システムを活用：

```typescript
interface StrictContext {
  requiredField: string;
  optionalField?: number;
}

const typedModule: PromptModule<StrictContext> = {
  createContext: () => ({
    requiredField: 'default value'
    // optionalFieldは省略可能
  }),
  
  state: [
    (ctx) => `必須フィールド: ${ctx.requiredField}`,
    (ctx) => ctx.optionalField ? `オプション: ${ctx.optionalField}` : null
  ]
};
```

### 3. 再利用性の向上

汎用的なモジュールを作成して組み合わせる：

```typescript
// 汎用的なエラーハンドリングモジュール
const errorHandlingModule: PromptModule = {
  guidelines: [
    'エラーが発生した場合は明確なメッセージを返す',
    '詳細なスタックトレースは含めない'
  ]
};

// 各機能モジュールと組み合わせて使用
const apiModule = merge(baseApiModule, errorHandlingModule);
const dbModule = merge(baseDatabaseModule, errorHandlingModule);
```

## 制約事項

### 階層制限

- 最大2階層まで（Section → SubSection → string）
- SubSectionは文字列のみを含む

### 動的コンテンツの制限

- DynamicContentはSection/SubSectionを生成不可
- 構造は静的に定義する必要がある

### 標準セクションの自動処理

- 標準セクション名を使用すると自動的にSectionElementに変換
- titleは自動的に設定される

## 次のステップ

モジュールの作成が完了したら、[USING_MODULES.md](./USING_MODULES.md)を参照してモジュールの使用方法を確認。