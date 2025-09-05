# はじめに - Moduler Prompt

このガイドでは、Moduler Promptフレームワークの基本的な使い方を説明します。

## インストール

```bash
npm install @moduler-prompt/core
```

## 基本概念

### 1. PromptModule

プロンプトモジュールは、AIへの指示を構造化したオブジェクトです：

```typescript
import type { PromptModule } from '@moduler-prompt/core';

const myModule: PromptModule = {
  objective: ['タスクを実行する'],
  instructions: ['手順1', '手順2'],
  cue: ['結果を出力']
};
```

### 2. Context

各モジュールは独自のContext型を定義できます：

```typescript
interface MyContext {
  userName: string;
  taskId: number;
}

const myModule: PromptModule<MyContext> = {
  createContext: () => ({
    userName: 'Alice',
    taskId: 123
  }),
  
  objective: [
    (context) => ({
      type: 'text',
      content: `${context.userName}のタスク#${context.taskId}を処理`
    })
  ]
};
```

### 3. Element

プロンプトの構成要素には6つの型があります：

- **TextElement**: シンプルなテキスト
- **MessageElement**: ロール付きメッセージ
- **MaterialElement**: 参考資料
- **ChunkElement**: 分割されたテキスト
- **SectionElement**: セクション（箇条書き）
- **SubSectionElement**: サブセクション

## 基本的な使い方

### シンプルな例

```typescript
import { compile, createContext } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';

// 1. モジュールを定義
const analysisModule: PromptModule = {
  objective: ['コードを分析する'],
  instructions: [
    '構文エラーをチェック',
    'パフォーマンス問題を特定'
  ],
  cue: ['分析結果をJSON形式で出力']
};

// 2. コンテキストを作成
const context = createContext(analysisModule);

// 3. コンパイル
const compiled = compile(analysisModule, context);

console.log(compiled.instructions); // objective + instructions
console.log(compiled.output);       // cue
```

### 動的コンテンツ

コンテキストに基づいて動的にコンテンツを生成：

```typescript
interface TaskContext {
  tasks: string[];
  priority: 'high' | 'medium' | 'low';
}

const taskModule: PromptModule<TaskContext> = {
  createContext: () => ({
    tasks: [],
    priority: 'medium'
  }),
  
  objective: ['タスクを処理する'],
  
  state: [
    (context) => ({
      type: 'text',
      content: `優先度: ${context.priority}`
    }),
    (context) => context.tasks.map(task => ({
      type: 'text',
      content: `- ${task}`
    }))
  ]
};

// 使用時
const context = createContext(taskModule);
context.tasks = ['タスクA', 'タスクB'];
context.priority = 'high';

const compiled = compile(taskModule, context);
```

### セクションとサブセクション

階層構造を持つコンテンツ：

```typescript
import type { SubSectionElement } from '@moduler-prompt/core';

const structuredModule: PromptModule = {
  // methodology自体が "Processing Methodology" セクションになる
  methodology: [
    '入力データを検証',
    '前処理を実行',
    '後述の「変換処理」を実行',
    {
      type: 'subsection',
      content: '',
      title: '変換処理',
      items: [
        'データを正規化',
        '特徴量を抽出',
        'ベクトル化'
      ]
    } as SubSectionElement,
    '結果を出力'
  ]
};

// コンパイル時に以下のような構造になる：
// ## Processing Methodology
// - 入力データを検証
// - 前処理を実行
// - 後述の「変換処理」を実行
// - 結果を出力
// ### 変換処理  （サブセクションは最後に配置）
//   - データを正規化
//   - 特徴量を抽出
//   - ベクトル化
```

## モジュールのマージ

複数のモジュールを統合：

```typescript
import { merge } from '@moduler-prompt/core';

const baseModule: PromptModule = {
  objective: ['基本タスク'],
  instructions: ['共通手順']
};

const extensionModule: PromptModule = {
  objective: ['追加タスク'],
  instructions: ['特別な手順']
};

// マージ
const mergedModule = merge(baseModule, extensionModule);
// mergedModule.objective = ['基本タスク', '追加タスク']
// mergedModule.instructions = ['共通手順', '特別な手順']
```

### 同名サブセクションのマージ

```typescript
const module1: PromptModule = {
  instructions: [
    {
      type: 'subsection',
      content: '',
      title: 'データ処理',
      items: ['ステップ1', 'ステップ2']
    } as SubSectionElement
  ]
};

const module2: PromptModule = {
  instructions: [
    {
      type: 'subsection',
      content: '',
      title: 'データ処理',  // 同じタイトル
      items: ['ステップ3']
    } as SubSectionElement
  ]
};

const merged = merge(module1, module2);
// サブセクションのitemsが結合される：
// ['ステップ1', 'ステップ2', 'ステップ3']
```

## 実践的な例

### チャット対話モジュール

```typescript
import type { PromptModule, MessageElement } from '@moduler-prompt/core';

interface ChatContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  systemPrompt: string;
}

const chatModule: PromptModule<ChatContext> = {
  createContext: () => ({
    messages: [],
    systemPrompt: 'あなたは親切なアシスタントです'
  }),
  
  objective: [
    (context) => ({
      type: 'text',
      content: context.systemPrompt
    })
  ],
  
  messages: [
    (context) => context.messages.map(msg => ({
      type: 'message',
      content: msg.content,
      role: msg.role
    } as MessageElement))
  ],
  
  cue: ['ユーザーの質問に答えてください']
};

// 使用例
const context = createContext(chatModule);
context.messages = [
  { role: 'user', content: 'こんにちは' },
  { role: 'assistant', content: 'こんにちは！' },
  { role: 'user', content: '今日の天気は？' }
];

const compiled = compile(chatModule, context);
```

### ドキュメント処理モジュール

```typescript
import type { PromptModule, ChunkElement } from '@moduler-prompt/core';

interface DocContext {
  documentName: string;
  chunks: Array<{
    content: string;
    pageNumber: number;
  }>;
}

const docModule: PromptModule<DocContext> = {
  createContext: () => ({
    documentName: '',
    chunks: []
  }),
  
  objective: ['ドキュメントを要約する'],
  
  chunks: [
    (context) => context.chunks.map((chunk, index) => ({
      type: 'chunk',
      content: chunk.content,
      partOf: context.documentName,
      index: index,
      usage: chunk.content.length
    } as ChunkElement))
  ],
  
  instructions: [
    '各ページの要点を抽出',
    '全体の要約を作成'
  ],
  
  schema: [
    {
      type: 'text',
      content: JSON.stringify({
        summary: 'string',
        keyPoints: ['string'],
        pageCount: 'number'
      }, null, 2)
    }
  ]
};
```

## 重要な制約

### 1. DynamicContentの制限

動的コンテンツ（関数）はSection/SubSectionElementを生成できません：

```typescript
// ❌ これはできません
const badModule: PromptModule = {
  instructions: [
    (context) => ({
      type: 'section',  // エラー: DynamicContentはSectionを作れない
      title: 'Dynamic Section',
      items: []
    })
  ]
};

// ✅ 静的に定義する必要があります
const goodModule: PromptModule = {
  instructions: [
    {
      type: 'section',
      content: '',
      title: 'Static Section',
      items: [
        // itemsの中身は動的に生成可能
        (context) => 'Dynamic item'
      ]
    } as SectionElement
  ]
};
```

### 2. 階層の制限

最大2階層まで（Section → SubSection → string）：

```typescript
// ✅ 正しい階層（標準セクションは自動的にSectionElementになる）
const validModule: PromptModule = {
  instructions: [
    'Item 1',
    {
      type: 'subsection',
      content: '',
      title: 'SubSection',
      items: ['SubItem 1', 'SubItem 2']  // 文字列のみ
    } as SubSectionElement
  ]
};
// コンパイル後：
// instructions[0] = {
//   type: 'section',
//   title: 'Instructions',
//   items: ['Item 1', { type: 'subsection', ... }]
// }
```

## 次のステップ

- [API リファレンス](./API.md) - 詳細なAPI仕様
- [仕様書 v2](./PROMPT_MODULE_SPEC_V2.md) - 設計思想と詳細仕様
- [コンセプト](./IDEAS.md) - フレームワークの理念

## サンプルコード

より多くの例は[GitHubリポジトリ](https://github.com/otolab/moduler-prompt)をご覧ください。