# API リファレンス

## @moduler-prompt/core

### 関数

#### `merge`

複数のプロンプトモジュールをマージします。

```typescript
function merge<T1, T2>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>
): PromptModule<T1 | T2>

function merge<T1, T2, T3>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>,
  module3: PromptModule<T3>
): PromptModule<T1 | T2 | T3>

function merge(...modules: PromptModule<any>[]): PromptModule<any>
```

**特徴:**
- 同名のサブセクションのitemsを結合
- 要素の順序: 通常要素 → サブセクション
- `createContext`は全て実行されて結果がマージされる（後の値で上書き）
- Context型はユニオン型になる

**例:**
```typescript
const module1: PromptModule = {
  objective: ['Task 1'],
  instructions: [{
    type: 'subsection',
    title: 'Algorithm',
    items: ['Step 1']
  }]
};

const module2: PromptModule = {
  objective: ['Task 2'],
  instructions: [{
    type: 'subsection',
    title: 'Algorithm',
    items: ['Step 2']
  }]
};

const merged = merge(module1, module2);
// merged.objective = ['Task 1', 'Task 2']
// merged.instructions = [文字列要素, { type: 'subsection', title: 'Algorithm', items: ['Step 1', 'Step 2'] }]
```

#### `compile`

プロンプトモジュールとコンテキストをコンパイルして、Element配列を生成します。

```typescript
function compile<TContext = Context>(
  module: PromptModule<TContext>,
  context: TContext
): CompiledPrompt

interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
}
```

**特徴:**
- 標準セクションを自動的にSectionElementに変換
- DynamicContentを実行して結果を文字列に変換
- セクション内の要素を並び替え（通常要素 → サブセクション）
- セクションタイプ（instructions/data/output）に応じて分類

**例:**
```typescript
const module: PromptModule<{ value: string }> = {
  objective: ['Process data'],
  state: [
    (context) => ({
      type: 'text',
      content: `Value: ${context.value}`
    })
  ]
};

const compiled = compile(module, { value: 'test' });
// compiled.instructions[0] = { type: 'section', title: 'Objective and Role', items: ['Process data'] }
// compiled.data[0] = { type: 'section', title: 'Current State', items: ['Value: test'] }
```

#### `createContext`

モジュールのcreateContext関数を使用してコンテキストを作成します。

```typescript
function createContext<TContext = Context>(
  module: PromptModule<TContext>
): TContext
```

**例:**
```typescript
const module: PromptModule<{ initialized: boolean }> = {
  createContext: () => ({ initialized: true }),
  objective: ['Task']
};

const context = createContext(module);
// context = { initialized: true }
```

### 型定義

#### `PromptModule<TContext>`

プロンプトモジュールの定義。

```typescript
interface PromptModule<TContext = any> {
  // Context生成
  createContext?: () => TContext;
  
  // Instructions セクション（自動的にSectionElementになる）
  objective?: SectionContent<TContext>;
  terms?: SectionContent<TContext>;
  methodology?: SectionContent<TContext>;
  instructions?: SectionContent<TContext>;
  guidelines?: SectionContent<TContext>;
  preparationNote?: SectionContent<TContext>;
  
  // Data セクション（自動的にSectionElementになる）
  state?: SectionContent<TContext>;
  materials?: SectionContent<TContext>;
  chunks?: SectionContent<TContext>;
  messages?: SectionContent<TContext>;
  
  // Output セクション（自動的にSectionElementになる）
  cue?: SectionContent<TContext>;
  schema?: SectionContent<TContext>;
}

// セクションコンテンツ型
type SectionContent<TContext = any> = 
  (string | SubSectionElement | DynamicContent<TContext>)[];
```

#### Element型

6種類の要素型が定義されています。

##### `TextElement`
```typescript
interface TextElement {
  type: 'text';
  content: string;
}
```

##### `MessageElement`
```typescript
interface MessageElement {
  type: 'message';
  content: string | Attachment[];
  role: 'system' | 'assistant' | 'user';
  name?: string;
}
```

##### `MaterialElement`
```typescript
interface MaterialElement {
  type: 'material';
  content: string | Attachment[];
  id: string;
  title: string;
  usage?: number;
}
```

##### `ChunkElement`
```typescript
interface ChunkElement {
  type: 'chunk';
  content: string | Attachment[];
  partOf: string;
  index?: number;
  usage?: number;
}
```

##### `SectionElement`
```typescript
interface SectionElement<TContext = any> {
  type: 'section';
  content: string;
  title: string;
  items: (string | SubSectionElement | DynamicContent<TContext>)[];
}
```

##### `SubSectionElement`
```typescript
interface SubSectionElement {
  type: 'subsection';
  content: string;
  title: string;
  items: string[];  // 文字列のみ
}
```

#### `DynamicContent<TContext>`

動的にコンテンツを生成する関数。

```typescript
type DynamicContent<TContext = any> = (
  context: TContext
) => DynamicElement[] | DynamicElement | null;

// DynamicElementはSection/SubSectionを除くElement
type DynamicElement = 
  | TextElement
  | MessageElement
  | MaterialElement
  | ChunkElement;
```

**制約:**
- Section/SubSectionElementは生成できない
- nullを返すと何も追加されない

#### 標準セクション定義

```typescript
const STANDARD_SECTIONS = {
  // Instructions
  objective: { type: 'instructions' as const, title: 'Objective and Role' },
  terms: { type: 'instructions' as const, title: 'Term Explanations' },
  methodology: { type: 'instructions' as const, title: 'Processing Methodology' },
  instructions: { type: 'instructions' as const, title: 'Instructions' },
  guidelines: { type: 'instructions' as const, title: 'Guidelines' },
  preparationNote: { type: 'instructions' as const, title: 'Response Preparation Note' },
  
  // Data
  state: { type: 'data' as const, title: 'Current State' },
  materials: { type: 'data' as const, title: 'Prepared Materials' },
  chunks: { type: 'data' as const, title: 'Input Chunks' },
  messages: { type: 'data' as const, title: 'Messages' },
  
  // Output
  cue: { type: 'output' as const, title: 'Output' },
  schema: { type: 'output' as const, title: 'Output Schema' }
} as const;
```

### 便利な型定義（再利用可能）

これらの型は強制されませんが、共通的な用途で利用できます。

```typescript
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

interface Attachment {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { path: string; mime_type: string };
}
```

## @moduler-prompt/process

### モジュール

#### `withMaterials`
参考資料をプロンプトに含めるモジュール。

#### `answerWithReferences`
資料を参照しながら回答する指示を追加。

#### `streamProcessing`
チャンク単位の逐次処理と状態管理。コンテキストに基づいて以下を動的に制御：
- 出力サイズ制御（`targetTokens`設定時）
- 初回・最終イテレーションの検出と適切な指示
- 状態のサイズが閾値を超えた場合の積極的な削減

### ワークフロー

#### `createStreamWorkflow(config)`
処理アルゴリズムとストリーム処理を組み合わせる。

#### `StreamProcessor`
チャンクのバッチ処理とステート管理を実行するクラス。