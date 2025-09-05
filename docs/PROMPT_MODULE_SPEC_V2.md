# プロンプトモジュール仕様 v2

## 概要

プロンプトモジュールは、生成AIへの指示を構造化して管理するためのフレームワークです。
名前を制限することで概念を強制的に揃え、一貫性のあるプロンプト設計を実現します。

## 基本構造

### 3つの大分類

プロンプトは3つの主要カテゴリで構成されます：

1. **Instructions（指示）**: AIへの指示・役割・処理手順
2. **Data（データ）**: 処理対象となる情報・参考資料
3. **Output（出力）**: 期待される出力形式・構造

### 標準セクション

フレームワークが提供する標準セクションは、自動的にSectionElementとして扱われます：

```typescript
// 標準セクション定義
const standardSections = {
  // Instructions
  objective: { type: 'instructions', title: 'Objective and Role' },
  terms: { type: 'instructions', title: 'Term Explanations' },
  methodology: { type: 'instructions', title: 'Processing Methodology' },
  instructions: { type: 'instructions', title: 'Instructions' },
  guidelines: { type: 'instructions', title: 'Guidelines' },
  preparationNote: { type: 'instructions', title: 'Response Preparation Note' },
  
  // Data
  state: { type: 'data', title: 'Current State' },
  materials: { type: 'data', title: 'Prepared Materials' },
  chunks: { type: 'data', title: 'Input Chunks' },
  messages: { type: 'data', title: 'Messages' },
  
  // Output
  cue: { type: 'output', title: 'Output' },
  schema: { type: 'output', title: 'Output Schema' }
};
```

## Element（要素）の定義

### 基本要素型

```typescript
// テキスト要素
interface TextElement {
  type: 'text';
  content: string;
}

// メッセージ要素
interface MessageElement {
  type: 'message';
  content: string | Attachment[];
  role: 'system' | 'assistant' | 'user';
  name?: string;
}

// 資料要素
interface MaterialElement {
  type: 'material';
  content: string | Attachment[];
  id: string;
  title: string;
  usage?: number;
}

// 分割テキスト要素
interface ChunkElement {
  type: 'chunk';
  content: string | Attachment[];
  partOf: string;
  index?: number;
  usage?: number;
}

// セクション要素（第1階層）
interface SectionElement<TContext = any> {
  type: 'section';
  content: string;  // セクション自体の説明（通常は空文字列）
  title: string;
  items: (string | SubSectionElement | DynamicContent<TContext>)[];
}

// サブセクション要素（第2階層）
interface SubSectionElement {
  type: 'subsection';
  content: string;  // サブセクション自体の説明（通常は空文字列）
  title: string;
  items: string[];
}

// 統合型
type Element = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement 
  | SectionElement
  | SubSectionElement;

// Attachment定義
interface Attachment {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { path: string; mime_type: string };
}
```

### 動的コンテンツ

```typescript
// 動的に生成できる要素（構造要素は除外）
type DynamicElement = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement;

// コンテキストに基づいて動的に要素を生成
type DynamicContent<TContext> = (context: TContext) => DynamicElement[] | DynamicElement | null;
```

## PromptModule の定義

```typescript
interface PromptModule<TContext = any> {
  // コンテキストの生成
  createContext?: () => TContext;
  
  // Instructions セクション（自動的にSectionElementになる）
  objective?: (string | SubSectionElement | DynamicContent<TContext>)[];
  terms?: (string | SubSectionElement | DynamicContent<TContext>)[];
  methodology?: (string | SubSectionElement | DynamicContent<TContext>)[];
  instructions?: (string | SubSectionElement | DynamicContent<TContext>)[];
  guidelines?: (string | SubSectionElement | DynamicContent<TContext>)[];
  preparationNote?: (string | SubSectionElement | DynamicContent<TContext>)[];
  
  // Data セクション（自動的にSectionElementになる）
  state?: (string | SubSectionElement | DynamicContent<TContext>)[];
  materials?: (string | SubSectionElement | DynamicContent<TContext>)[];
  chunks?: (string | SubSectionElement | DynamicContent<TContext>)[];
  messages?: (string | SubSectionElement | DynamicContent<TContext>)[];
  
  // Output セクション（自動的にSectionElementになる）
  cue?: (string | SubSectionElement | DynamicContent<TContext>)[];
  schema?: (string | SubSectionElement | DynamicContent<TContext>)[];
}
```

### 標準セクションの自動変換

標準セクションに指定された内容は、コンパイル時に自動的にSectionElementとして処理されます：

```typescript
// 入力（簡潔な記法）
const module: PromptModule = {
  methodology: [
    '入力データを検証',
    '前処理を実行',
    {
      type: 'subsection',
      content: '',
      title: '変換処理',
      items: ['データを正規化', '特徴量を抽出']
    } as SubSectionElement
  ]
};

// コンパイル後の出力
// ## Processing Methodology
// - 入力データを検証
// - 前処理を実行
// ### 変換処理
//   - データを正規化
//   - 特徴量を抽出
```

## Context の定義

各PromptModuleは独自のContext型を定義します：

```typescript
// 各モジュールが独自に定義
interface StreamingContext {
  state: { content: string; usage: number };
  chunks: Array<{
    content: string;
    partOf: string;
    usage: number;
  }>;
  range: { start: number; end: number };
}

interface DialogueContext {
  messages: Array<{
    content: string;
    role: 'system' | 'assistant' | 'user';
    name?: string;
  }>;
  materials?: Array<{
    id: string;
    title: string;
    content: string;
    usage: number;
  }>;
}
```

## 処理フロー

### 1. モジュールのマージ

複数のモジュールを統合する際の動作：

```typescript
function merge<T1, T2>(...modules: [PromptModule<T1>, PromptModule<T2>]): PromptModule<T1 | T2>;
```

マージ戦略：
- 同名セクション内の要素は結合される
- 同名サブセクションのitemsは結合される
- createContextは全て実行されて結果がマージされる（後の値で上書き）
- 順序: 通常要素 → サブセクション

### 2. コンパイル

モジュールとコンテキストから最終的なElement配列を生成：

```typescript
interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
}

function compile<TContext>(
  module: PromptModule<TContext>, 
  context: TContext
): CompiledPrompt;
```

コンパイル処理：
1. 標準セクションを自動的にSectionElementに変換
2. DynamicContentを実行してDynamicElementを生成し、文字列に変換
3. セクション内の要素を並び替え（通常要素 → サブセクション）
4. セクションタイプ（instructions/data/output）に応じて分類

### 3. ドライバーでのフォーマット

各AIモデルに最適な形式への変換：

```typescript
interface Driver {
  format(prompt: CompiledPrompt): ModelSpecificFormat;
  formatElement(element: Element): string | ChatMessage;
}
```

## 使用例

### ストリーミング処理モジュール

```typescript
const streamProcessingModule: PromptModule<StreamingContext> = {
  createContext: () => ({
    state: { content: '', usage: 0 },
    chunks: [],
    range: { start: 0, end: 0 }
  }),
  
  objective: ['ストリーミング処理を実行する'],
  
  methodology: [
    'チャンクごとに順次処理を実行',
    {
      type: 'subsection',
      content: '',
      title: 'Algorithm',
      items: [
        '現在の状態を読み込む',
        'チャンクを処理する',
        '状態を更新する',
        '次の状態を出力する'
      ]
    } as SubSectionElement
  ],
  
  state: [
    (context: StreamingContext) => ({
      type: 'text',
      content: `Current state (${context.state.usage} tokens):\n${context.state.content}`
    } as TextElement)
  ],
  
  chunks: [
    (context: StreamingContext) => 
      context.chunks.slice(context.range.start, context.range.end)
        .map(chunk => ({
          type: 'chunk',
          content: chunk.content,
          partOf: chunk.partOf,
          usage: chunk.usage
        } as ChunkElement))
  ]
};
```

### 対話モジュール

```typescript
const dialogueModule: PromptModule<DialogueContext> = {
  createContext: () => ({
    messages: [],
    materials: []
  }),
  
  objective: ['対話形式で応答を生成する'],
  
  messages: [
    (context: DialogueContext) =>
      context.messages.map(msg => ({
        type: 'message',
        content: msg.content,
        role: msg.role,
        name: msg.name
      } as MessageElement))
  ],
  
  materials: [
    (context: DialogueContext) =>
      context.materials?.map(mat => ({
        type: 'material',
        content: mat.content,
        id: mat.id,
        title: mat.title,
        usage: mat.usage
      } as MaterialElement)) || []
  ]
};
```

## 重要な制約

### 動的コンテンツの制限
- DynamicContentはSectionElement, SubSectionElementを生成できない
- 生成可能: TextElement, MessageElement, MaterialElement, ChunkElement
- 理由: セクション構造は静的に定義されるべき

### 階層構造の制限
- 最大2階層: Section → SubSection → string
- SubSectionElementのitemsは文字列のみ
- 深い階層化は避ける設計

### 標準セクションの自動処理
- 標準セクションの内容は自動的にSectionElementとして処理
- 明示的なSectionElement指定は不要（冗長）
- titleは標準セクション定義から自動設定

## まとめ

- **シンプルな記法**: 標準セクションは配列で簡潔に記述
- **自動変換**: コンパイル時に適切な構造に自動変換
- **型安全性**: TypeScriptの型システムで保証
- **明確な分離**: 構造は静的、データは動的
- **段階的処理**: merge → compile → format