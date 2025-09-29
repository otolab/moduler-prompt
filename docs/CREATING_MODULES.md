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

## SectionContent型（v0.2.0で拡張）

標準セクションに配置できる要素の型：

```typescript
// v0.2.0以降
type SectionContent<TContext> = (
  | string                        // プレーンテキスト
  | Element                       // 任意のElement（静的配置）
  | DynamicContent<TContext>      // 動的生成関数
)[];
```

これにより、以下のような柔軟な記述が可能：
- **文字列**: 単純なテキスト
- **Element**: TextElement、MessageElement、MaterialElement、ChunkElement、JSONElement、SubSectionElementを直接配置
- **DynamicContent**: コンテキストに基づく動的生成

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
  
  // データをchunksセクションに含める
  chunks: [
    (ctx) => {
      if (!ctx.items || ctx.items.length === 0) return null;
      
      // 各アイテムをChunkElementとして返す
      return ctx.items.map((item, index) => ({
        type: 'chunk' as const,
        content: item,
        partOf: 'input-data',
        index
      }));
    }
  ],
  
  // サブセクション
  instructions: [
    '以下の手順で処理を実行：',
    {
      type: 'subsection',
      title: 'Processing Steps',
      items: [
        '1. Input Chunksのデータを検証',
        (ctx) => ctx.options?.verbose ? '2. デバッグ情報を出力' : null,
        '3. 処理結果を生成'
      ]
    },
    // 箇条書きが必要な場合は明示的に記述
    {
      type: 'subsection',
      title: 'Guidelines',
      items: [
        '以下の観点で判定：',
        '- リクエストの種類',
        '- 必要なアクション',
        '- 発行すべきイベント'
      ]
    }
  ]
};
```

## コンパイルプロセス

### PromptModuleからCompiledPromptへの変換

モジュールは`compile`関数により、最終的な構造化プロンプト（CompiledPrompt）に変換される：

```
PromptModule（定義） → compile(module, context) → CompiledPrompt（Element配列）
```

CompiledPromptは3つのセクションを持つ：
```typescript
interface CompiledPrompt {
  instructions: Element[];  // 指示要素の配列
  data: Element[];         // データ要素の配列
  output: Element[];       // 出力要素の配列
}
```

### Element型

Elementは、プロンプトを構成する基本要素：

```typescript
type Element =
  | TextElement        // テキスト: { type: 'text', content: string }
  | MessageElement     // メッセージ: { type: 'message', role: 'system'|'assistant'|'user', content: string }
  | MaterialElement    // 資料（引用・参照文書）: { type: 'material', id: string, title: string, content: string }
  | ChunkElement      // チャンク: { type: 'chunk', content: string, partOf: string, index?: number }
  | JSONElement       // JSONスキーマ・構造化データ: { type: 'json', content: object | string }
  | SectionElement    // セクション: { type: 'section', title: string, items: (string | SubSectionElement)[] }
  | SubSectionElement // サブセクション: { type: 'subsection', title: string, items: string[] }
```

### 標準セクションの自動処理

標準セクション（objective、instructions等）は、compile時に自動的にSectionElementに変換される：

```typescript
const module: PromptModule = {
  objective: ['AIの目的'],  // 文字列として定義
  instructions: ['処理手順']
};

// compile後は自動的にSectionElementに
// {
//   type: 'section',
//   title: 'Objective and Role',  // 自動設定
//   content: '',
//   items: ['AIの目的']
// }
```

## DynamicContent（動的コンテンツ）

### 基本的な使い方

コンテキストに基づいて内容を生成する関数：

```typescript
type DynamicContent<TContext> = (context: TContext) => 
  | string                    // 単純な文字列
  | string[]                  // 文字列配列
  | DynamicElement           // 動的に生成可能なElement
  | DynamicElement[]         // Element配列
  | null                     // 何も返さない
  | undefined;               // 何も返さない

// DynamicElement: 動的に生成可能な要素（構造要素は除く）
type DynamicElement =
  | TextElement
  | MessageElement
  | MaterialElement
  | ChunkElement
  | JSONElement;       // JSONスキーマも動的生成可能
  // SectionElementとSubSectionElementは生成不可（構造は静的）
```

### 実装例

```typescript
const module: PromptModule<{ data: any[] }> = {
  state: [
    // 文字列を返す
    (ctx) => ctx.data.length > 0 ? 'データあり' : 'データなし'
  ],

  // シンプルな入力データはinputsセクションへ
  inputs: [
    (ctx) => ctx.data ? JSON.stringify(ctx.data) : null
  ],

  // MaterialElementを直接配置（v0.2.0以降）
  materials: [
    // 静的なMaterialElement
    {
      type: 'material',
      id: 'static-doc',
      title: 'API Documentation',
      content: 'APIドキュメントの内容'
    },
    // 動的なMaterialElement
    (ctx) => {
      if (!ctx.data || ctx.data.length === 0) return null;

      // MaterialElement型のオブジェクトを返す
      return {
        type: 'material' as const,
        id: 'input-data',
        title: 'Input Data',
        content: JSON.stringify(ctx.data, null, 2)
      };
    }
  ],
  
  // ChunkElement配列を返す
  chunks: [
    (ctx) => ctx.data?.map((item, index) => ({
      type: 'chunk' as const,
      content: typeof item === 'string' ? item : JSON.stringify(item),
      partOf: 'dataset',
      index
    }))
  ],
  
  // MessageElementを使った例
  messages: [
    (ctx) => ({
      type: 'message' as const,
      role: 'user' as const,
      content: `Process these items: ${ctx.data.map(d => d.name).join(', ')}`
    })
  ],

  // JSONElementを使った構造化出力の定義（v0.2.0以降）
  schema: [
    // 静的なJSONElement（contextを使わない場合）
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['result', 'items']
      }
    },
    // 動的なJSONElement（contextに基づく場合）
    (ctx) => ctx.needsDetailedSchema ? {
      type: 'json' as const,
      content: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          details: { type: 'object' }
        }
      }
    } : null
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
| inputs | シンプルな入力データ |
| materials | 参考資料 |
| chunks | 分割された入力データ |
| messages | 対話履歴 |

### Output（出力）セクション

Output大セクションは以下の2つの標準セクションで構成されます：

| セクション | 用途 |
|---------|------|
| cue | 出力開始の合図 |
| schema | 出力形式の定義（JSONElement等） |

**注意**: `outputs`という標準セクションは存在しません。Output大セクションは`cue`と`schema`のみで構成されます。

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

### schemaセクションのマージ例

```typescript
// 最初のモジュール（schemaなし）
const stateModule: PromptModule = {
  objective: ['状態を管理する'],
  state: ['現在の状態']
};

// 2番目のモジュール（schemaあり）
const analyzeModule: PromptModule = {
  instructions: ['分析を実行'],
  schema: [
    'JSON形式で出力:',
    {
      type: 'json',
      content: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          score: { type: 'number' }
        }
      }
    }
  ]
};

// マージ結果
const merged = merge(stateModule, analyzeModule);
// merged.schemaには analyzeModule.schema が含まれる
// compile時に自動的に metadata.outputSchema が設定される
```

### 合成時の動作

- **セクション要素**: 同名セクションの要素は配列として結合
  - 例: `objective: ['目的1']` + `objective: ['目的2']` → `objective: ['目的1', '目的2']`
- **createContext**: 同名プロパティは後の値で上書き
  - 例: `{ value: 1 }` + `{ value: 2 }` → `{ value: 2 }`
- **サブセクション**: 同名のサブセクションはitemsが結合される
- **重複**: 意図的な繰り返しをサポート（セパレータ、強調など）
- **schema**: 他の標準セクションと同様にマージ
  - 各モジュールのschema要素は順番に結合される
  - JSONElementを含む全てのElement型が保持される
  - 最初のJSONElementがoutputSchemaとして使用される
  - 例: module1にschemaがなくても、module2のschemaは正しくマージされる

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

// データを扱う汎用モジュール（実際のprocessパッケージのwithMaterialsを参考）
const withDataModule: PromptModule<{ inputData?: any[] }> = {
  materials: [
    (ctx) => {
      if (!ctx.inputData || ctx.inputData.length === 0) return null;
      
      return ctx.inputData.map((data, index) => ({
        type: 'material' as const,
        id: `data-${index}`,
        title: `Data Item ${index + 1}`,
        content: typeof data === 'string' ? data : JSON.stringify(data)
      }));
    }
  ],
  instructions: [
    'Process the data provided in the Prepared Materials section'
  ]
};

// 各機能モジュールと組み合わせて使用
const apiModule = merge(baseApiModule, errorHandlingModule, withDataModule);
const dbModule = merge(baseDatabaseModule, errorHandlingModule);
```

## 制約事項

### 階層制限

- 最大2階層まで（Section → SubSection → string）
- SubSectionは文字列のみを含む

### 動的コンテンツの制限

- DynamicContentはSection/SubSectionを生成不可
- 構造は静的に定義する必要がある
- 生成可能なのは、TextElement、MessageElement、MaterialElement、ChunkElement、JSONElementのみ

## 次のステップ

モジュールの作成が完了したら、[USING_MODULES.md](./USING_MODULES.md)を参照してモジュールの使用方法を確認。