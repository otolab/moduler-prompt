# プロンプトモジュール仕様 v2

## 概要

プロンプトモジュールは、生成AIへの指示を構造化して管理するためのフレームワークです。
名前を制限することで概念を強制的に揃え、一貫性のあるプロンプト設計を実現します。

## 基本構造

### 3つの大分類

プロンプトは3つの主要セクションで構成されます：

1. **Instructions（指示）**: AIへの指示・役割・処理手順
2. **Data（データ）**: 処理対象となる情報・参考資料
3. **Output（出力）**: 期待される出力形式・構造

### セクション定義

```typescript
interface SectionDefinition {
  name: string;
  type: 'instructions' | 'data' | 'output';
  title: string;
}

// フレームワークが提供する標準セクション
const standardSections: SectionDefinition[] = [
  // Instructions セクション
  { name: 'objective', type: 'instructions', title: 'Objective and Role' },
  { name: 'terms', type: 'instructions', title: 'Term Explanations' },
  { name: 'processing', type: 'instructions', title: 'Processing Algorithm' }, // 新規追加
  { name: 'instructions', type: 'instructions', title: 'Instructions' },
  { name: 'guidelines', type: 'instructions', title: 'Guidelines' }, // advicesから統一
  { name: 'preparationNote', type: 'instructions', title: 'Response Preparation Note' },
  
  // Data セクション
  { name: 'state', type: 'data', title: 'Current State' },
  { name: 'materials', type: 'data', title: 'Prepared Materials' },
  { name: 'chunks', type: 'data', title: 'Input Chunks' },
  { name: 'messages', type: 'data', title: 'Messages' },
  
  // Output セクション
  { name: 'cue', type: 'output', title: 'Output' },
  { name: 'schema', type: 'output', title: 'Output Schema' } // 新規追加
];
```

## Element（要素）の定義

ChunkItemから名称変更し、型付けされた要素として再定義します。

### 基本インターフェース

```typescript
// 基底となるElement型
interface BaseElement {
  type: string;
  content: string | Attachment[];
}

// メッセージ要素
interface MessageElement extends BaseElement {
  type: 'message';
  role: 'system' | 'assistant' | 'user';
  name?: string;
}

// 資料要素
interface MaterialElement extends BaseElement {
  type: 'material';
  id: string;
  title: string;
  usage?: number;
}

// 分割テキスト要素
interface ChunkElement extends BaseElement {
  type: 'chunk';
  partOf: string;  // 元のファイル名やドキュメント名
  index?: number;  // 分割順序
  usage?: number;
}

// テキスト要素（シンプルなテキスト）
interface TextElement extends BaseElement {
  type: 'text';
}

// セクション要素（第1階層）
interface SectionElement extends BaseElement {
  type: 'section';
  title: string;
  items: (string | SubSectionElement)[];  // 文字列またはサブセクションの箇条書き
}

// サブセクション要素（第2階層）
interface SubSectionElement extends BaseElement {
  type: 'subsection';
  title: string;
  items: string[];  // 文字列の箇条書きのみ
}

// 統合型
type Element = 
  | MessageElement 
  | MaterialElement 
  | ChunkElement 
  | TextElement 
  | SectionElement
  | SubSectionElement;

// Attachment定義（メディア対応）
interface Attachment {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { path: string; mime_type: string };
}
```

### 動的コンテンツ

```typescript
// 動的に生成できる要素の型（SectionElement, SubSectionElementは除外）
type DynamicElement = 
  | MessageElement 
  | MaterialElement 
  | ChunkElement 
  | TextElement;

// コンテキストに基づいて動的に要素を生成
type DynamicContent = (context: Context) => DynamicElement[] | DynamicElement | null;

// プロンプトモジュールでの使用
type ModuleContent = (string | Element | DynamicContent)[];
```

## PromptModule の定義

```typescript
interface PromptModule<TContext = any> {
  // コンテキストの生成
  createContext?: () => TContext;
  
  // Instructions セクション
  objective?: ModuleContent;
  terms?: ModuleContent;
  processing?: ModuleContent;  // 新規: アルゴリズム定義（instructionsより上位）
  instructions?: ModuleContent;
  guidelines?: ModuleContent;
  preparationNote?: ModuleContent;
  
  // Data セクション
  state?: ModuleContent;
  materials?: ModuleContent;
  chunks?: ModuleContent;
  messages?: ModuleContent;
  
  // Output セクション
  cue?: ModuleContent;
  schema?: ModuleContent;  // 新規: 出力スキーマ定義
}
```

## Context の定義

Contextは各PromptModuleが自由に定義します。Coreフレームワークは、Contextという概念が存在することのみを定義します。

```typescript
// Coreでは型を定義しない（anyまたはunknown）
type Context = any;

// 各モジュールが独自のContext型を定義
interface StreamingContext {
  state: ContentWithUsage;
  chunks: Chunk[];
  range: { start: number; end: number };
  iteration: {
    current: number;
    total?: number;
    isFirst: boolean;
    isLast: boolean;
  };
}

interface DialogueContext {
  messages: Message[];
  materials?: Material[];
  targetTokens?: number;
}

// 汎用的な型定義（各モジュールで再利用可能）
interface ContentWithUsage {
  content: string;
  usage: number;
}

interface Material extends ContentWithUsage {
  id: string;
  title: string;
  attachments?: Attachment[];
}

interface Chunk extends ContentWithUsage {
  partOf: string;
  attachments?: Attachment[];
}

interface Message {
  content: string;
  role: 'system' | 'assistant' | 'user';
  usage?: number;
  name?: string;
  attachments?: Attachment[];
}
```

## 処理フロー

### 1. モジュールのマージ

```typescript
function merge<T1, T2>( 
  module1: PromptModule<T1>,
  module2: PromptModule<T2>
): PromptModule<T1 | T2> {
  return {
    // Context型はユニオン型になる
    createContext: () => {
      // 実装時の判断に委ねる
      // 最初のモジュールのcreateContextを使用、など
      if (module1.createContext) return module1.createContext();
      if (module2.createContext) return module2.createContext();
      return {} as T1 | T2;
    },
    
    // セクションごとにマージ戦略を適用
    objective: mergeSection(module1.objective, module2.objective),
    // ... 他のセクション
  };
}

// セクションのマージ戦略
function mergeSection(
  section1?: ModuleContent,
  section2?: ModuleContent
): ModuleContent | undefined {
  if (!section1) return section2;
  if (!section2) return section1;
  
  const merged: ModuleContent = [];
  const subsections: Map<string, SubSectionElement> = new Map();
  const sections: Map<string, SectionElement> = new Map();
  const plainItems: (string | Element | DynamicContent)[] = [];
  
  // 両セクションの要素を分類
  for (const item of [...section1, ...section2]) {
    if (typeof item === 'function') {
      // DynamicContent（関数）はそのまま保持
      plainItems.push(item);
    } else if (typeof item === 'object' && 'type' in item) {
      if (item.type === 'subsection') {
        const existing = subsections.get(item.title);
        if (existing) {
          // 同名のサブセクションは再帰的にマージ
          subsections.set(item.title, {
            ...item,
            items: [...existing.items, ...item.items]
          });
        } else {
          subsections.set(item.title, item);
        }
      } else if (item.type === 'section') {
        const existing = sections.get(item.title);
        if (existing) {
          // 同名のセクションは再帰的にマージ（itemsをマージ）
          sections.set(item.title, {
            ...item,
            items: mergeSubItems(existing.items, item.items)
          });
        } else {
          sections.set(item.title, item);
        }
      } else {
        plainItems.push(item);
      }
    } else {
      // 文字列など
      plainItems.push(item);
    }
  }
  
  // 結合順序: 通常要素 → セクション → サブセクション
  merged.push(...plainItems);
  merged.push(...Array.from(sections.values()));
  merged.push(...Array.from(subsections.values()));
  
  return merged;
}

// SectionElementのitemsをマージ
function mergeSubItems(
  items1: (string | SubSectionElement)[],
  items2: (string | SubSectionElement)[]
): (string | SubSectionElement)[] {
  const merged: (string | SubSectionElement)[] = [];
  const subsections: Map<string, SubSectionElement> = new Map();
  const strings: string[] = [];
  
  for (const item of [...items1, ...items2]) {
    if (typeof item === 'string') {
      strings.push(item);
    } else {
      const existing = subsections.get(item.title);
      if (existing) {
        // 同名のサブセクションのitemsを結合
        subsections.set(item.title, {
          ...item,
          items: [...existing.items, ...item.items]
        });
      } else {
        subsections.set(item.title, item);
      }
    }
  }
  
  // 順序: 文字列 → サブセクション
  merged.push(...strings);
  merged.push(...Array.from(subsections.values()));
  
  return merged;
}
```

### 2. コンパイル（モジュール + コンテキスト → Elements）

```typescript
interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
}

function compile<TContext>(
  module: PromptModule<TContext>, 
  context: TContext
): CompiledPrompt {
  const compiled: CompiledPrompt = {
    instructions: [],
    data: [],
    output: []
  };
  
  // 各セクションをコンパイル
  for (const [sectionName, sectionContent] of Object.entries(module)) {
    if (sectionName === 'createContext') continue;
    if (!sectionContent) continue;
    
    const sectionType = getSectionType(sectionName);
    const compiledElements = compileSection(sectionContent, context);
    
    compiled[sectionType].push(...compiledElements);
  }
  
  return compiled;
}

function compileSection(
  content: ModuleContent,
  context: any
): Element[] {
  const elements: Element[] = [];
  
  for (const item of content) {
    if (typeof item === 'function') {
      // DynamicContentを実行
      const result = item(context);
      if (result) {
        if (Array.isArray(result)) {
          // DynamicElement[]の場合
          // 注意: SectionElement, SubSectionElementは含まれない
          elements.push(...result);
        } else {
          // 単一のDynamicElement
          elements.push(result);
        }
      }
    } else if (typeof item === 'string') {
      // 文字列をTextElementに変換
      elements.push({
        type: 'text',
        content: item
      } as TextElement);
    } else if (typeof item === 'object' && 'type' in item) {
      // すでにElement（静的に定義されたものは全て許可）
      elements.push(item as Element);
    }
  }
  
  return elements;
}
```

### 3. ドライバーでのフォーマット

```typescript
interface Driver {
  // Elementを受け取り、モデル固有の形式に変換
  format(prompt: CompiledPrompt): ModelSpecificFormat;
  
  // 各Elementタイプに応じた最適な整形
  formatElement(element: Element): string | ChatMessage;
}
```

## ドライバーの責任

ドライバーは各AIモデルに最適な形式への変換を担当します：

### OpenAI Driver の例

```typescript
class OpenAIDriver implements Driver {
  formatElement(element: Element): ChatMessage {
    switch (element.type) {
      case 'message':
        return {
          role: element.role,
          content: element.content,
          name: element.name
        };
      case 'material':
        return {
          role: 'system',
          content: `# ${element.title}\nID: ${element.id}\n\n${element.content}`
        };
      case 'chunk':
        return {
          role: 'system',
          content: `[Part of ${element.partOf}]\n${element.content}`
        };
      // ...
    }
  }
}
```

### Claude Driver の例

```typescript
class ClaudeDriver implements Driver {
  formatElement(element: Element): string {
    switch (element.type) {
      case 'material':
        // Claudeに最適化されたXMLタグを使用
        return `<material id="${element.id}" title="${element.title}">
${element.content}
</material>`;
      // ...
    }
  }
}
```

## 使用例

### ストリーミング処理モジュール

```typescript
interface StreamingContext {
  state: ContentWithUsage;
  chunks: Chunk[];
  range: { start: number; end: number };
  iteration: {
    current: number;
    total?: number;
    isFirst: boolean;
    isLast: boolean;
  };
}

const streamProcessingModule: PromptModule<StreamingContext> = {
  createContext: () => ({
    state: { content: '', usage: 0 },
    chunks: [],
    range: { start: 0, end: 0 },
    iteration: { current: 0, isFirst: true, isLast: false }
  }),
  
  objective: ['ストリーミング処理を実行する'],
  
  processing: [
    {
      type: 'section',
      title: 'Stream Processing',
      items: [
        'チャンクごとに順次処理を実行',
        {
          type: 'subsection',
          title: 'Algorithm',
          items: [
            '1. 現在の状態を読み込む',
            '2. チャンクを処理する',
            '3. 状態を更新する',
            '4. 次の状態を出力する'
          ]
        } as SubSectionElement
      ]
    } as SectionElement
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
interface DialogueContext {
  messages: Message[];
  materials?: Material[];
  targetTokens?: number;
}

const dialogueModule: PromptModule<DialogueContext> = {
  createContext: () => ({
    messages: [],
    materials: [],
    targetTokens: 4000
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

## バリデーション

TypeScriptの型システムを基本とし、必要に応じてZodによる実行時検証を追加：

```typescript
import { z } from 'zod';

const ElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    content: z.union([z.string(), AttachmentSchema.array()]),
    role: z.enum(['system', 'assistant', 'user']),
    name: z.string().optional()
  }),
  // ... 他のElement型
]);

function validateModule(module: unknown): PromptModule {
  return PromptModuleSchema.parse(module);
}
```

## パッケージ構成

```
@moduler-prompt/
├── core/          # 基本型定義、merge、compile
├── driver/        # 各AIモデル向けドライバー
│   ├── openai/
│   ├── anthropic/
│   └── vertex/
├── process/       # ストリーミング等の処理パターン
└── presets/       # 事前定義モジュール集
```

## 重要な制約

### 動的コンテンツの制限
- **DynamicContent（関数）はSectionElement, SubSectionElementを生成できない**
- 生成可能: TextElement, MessageElement, MaterialElement, ChunkElement
- 理由: マージ時の順序制御（サブセクションを最後に配置）を保証するため

### 階層構造の制限
- **最大2階層まで**: SectionElement → SubSectionElement → string
- SubSectionElementのitemsは文字列のみ
- 深い階層化は避ける設計

## まとめ

- **フレームワークが概念を定義**: セクション名を制限して一貫性を確保
- **Elementによる型安全性**: 各要素タイプに応じた構造を定義
- **ドライバーでの最適化**: モデル固有のフォーマットはドライバーが担当
- **静的な定義**: エラー時は失敗、フォールバックは不要
- **段階的な処理**: merge → compile → format の明確な分離
- **動的と静的の明確な分離**: 構造は静的に定義、データのみ動的に生成