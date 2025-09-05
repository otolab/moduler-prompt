# モジュールAPI

## 概要

プロンプトモジュールは、AIへの指示や文脈を構造化して定義するコンポーネントです。`@moduler-prompt/process`パッケージは、特定の処理パターンに特化したモジュールを提供します。

## 基本構造

すべてのモジュールは`PromptModule<TContext>`インターフェースを実装します：

```typescript
interface PromptModule<TContext> {
  objective?: SectionContent<TContext>[];
  terms?: SectionContent<TContext>[];
  methodology?: SectionContent<TContext>[];
  instructions?: SectionContent<TContext>[];
  state?: SectionContent<TContext>[];
  materials?: SectionContent<TContext>[];
  cue?: SectionContent<TContext>[];
  guidelines?: SectionContent<TContext>[];
  createContext?: () => Partial<TContext>;
}
```

## Stream Processing モジュール

### streamProcessing

大規模テキストをチャンクに分割して処理するための基本モジュールです。

```typescript
import { streamProcessing } from '@moduler-prompt/process/modules';
```

#### 特徴

- 状態（State）の管理と更新
- チャンク範囲（Range）の自動検出
- 最初/最後のイテレーションの識別
- サイズ制御の指示

#### コンテキスト

```typescript
interface StreamProcessingContext {
  chunks?: Array<{
    content: string;
    partOf?: string;
    usage?: number;
    attachments?: any[];
  }>;
  state?: {
    content: string;
    usage?: number;
  };
  range?: {
    start?: number;
    end?: number;
  };
  targetTokens?: number;
}
```

#### 使用例

```typescript
import { compile } from '@moduler-prompt/core';
import { streamProcessing } from '@moduler-prompt/process/modules';

const context: StreamProcessingContext = {
  chunks: [/* チャンクデータ */],
  state: { content: '前回の処理結果', usage: 100 },
  range: { start: 0, end: 3 },
  targetTokens: 500
};

const prompt = compile(streamProcessing, context);
```

## Dialogue モジュール

### dialogueBase

対話型インタラクションの基本モジュールです。

```typescript
import { dialogueBase } from '@moduler-prompt/process/modules';
```

#### 特徴

- 会話履歴の管理
- アシスタントとしての振る舞い定義
- 文脈に基づく応答生成

#### コンテキスト

```typescript
interface DialogueContext {
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

### firstOfTwoPassResponse / secondOfTwoPassResponse

2パス処理用の拡張モジュールです。

```typescript
import { 
  firstOfTwoPassResponse,
  secondOfTwoPassResponse 
} from '@moduler-prompt/process/modules';
```

#### 特徴

- **第1パス**: 準備ノート（思考過程）の生成
- **第2パス**: 準備ノートを基にした最終応答の生成

#### 使用例

```typescript
import { merge } from '@moduler-prompt/core';

// 第1パス: 準備
const firstPassModule = merge(dialogueBase, firstOfTwoPassResponse);
const preparationNote = await driver.query(compile(firstPassModule, context));

// 第2パス: 最終応答
const secondContext = {
  ...context,
  preparationNote: { content: preparationNote.content }
};
const secondPassModule = merge(dialogueBase, secondOfTwoPassResponse);
const response = await driver.query(compile(secondPassModule, secondContext));
```

### withTalkState

会話の状態管理を追加するモジュールです。

```typescript
import { withTalkState } from '@moduler-prompt/process/modules';
```

#### 特徴

- 会話の文脈維持
- 前回の発言を考慮した応答
- 一貫性のある対話の実現

## Summarize モジュール

### summarizeBase

要約処理の基本モジュールです。

```typescript
import { summarizeBase } from '@moduler-prompt/process/modules';
```

#### 特徴

- 長文の要約生成
- 重要情報の抽出
- 指定トークン数への圧縮

### analyzeForSummary

要約前の分析フェーズ用モジュールです。

```typescript
import { analyzeForSummary } from '@moduler-prompt/process/modules';
```

#### 特徴

- コンテンツの構造分析
- キーポイントの識別
- 要約戦略の決定

### contentSummarize

実際の要約生成用モジュールです。

```typescript
import { contentSummarize } from '@moduler-prompt/process/modules';
```

#### 特徴

- 分析結果に基づく要約
- トークン数の制御
- 情報の優先順位付け

#### 使用例

```typescript
import { merge } from '@moduler-prompt/core';
import { 
  streamProcessing,
  analyzeForSummary,
  contentSummarize 
} from '@moduler-prompt/process/modules';

// 分析フェーズ
const analysisModule = merge(streamProcessing, analyzeForSummary);
const analysisResult = await driver.query(compile(analysisModule, context));

// 要約フェーズ
const summarizeModule = merge(streamProcessing, contentSummarize);
const summary = await driver.query(compile(summarizeModule, {
  ...context,
  preparationNote: { content: analysisResult.content }
}));
```

## Material モジュール

### withMaterials

参考資料を含めるための拡張モジュールです。

```typescript
import { withMaterials } from '@moduler-prompt/process/modules';
```

#### 特徴

- 外部資料の参照
- コンテキスト情報の提供
- 根拠に基づく処理

#### コンテキスト

```typescript
interface MaterialContext {
  materials?: Array<{
    title: string;
    content: string;
    type?: string;
    metadata?: Record<string, any>;
  }>;
}
```

#### 使用例

```typescript
import { merge } from '@moduler-prompt/core';
import { withMaterials } from '@moduler-prompt/process/modules';

const moduleWithMaterials = merge(baseModule, withMaterials);

const context = {
  materials: [
    { title: '参考文献1', content: '内容...' },
    { title: 'データソース', content: 'データ...' }
  ]
};

const prompt = compile(moduleWithMaterials, context);
```

## モジュールの組み合わせ

モジュールは`merge`関数で組み合わせることができます：

```typescript
import { merge } from '@moduler-prompt/core';
import { 
  dialogueBase,
  withTalkState,
  withMaterials 
} from '@moduler-prompt/process/modules';

// 複数のモジュールを組み合わせ
const enhancedDialogue = merge(
  dialogueBase,
  withTalkState,
  withMaterials
);

// カスタムモジュールとの組み合わせ
const customModule: PromptModule<any> = {
  instructions: ['カスタム指示'],
  guidelines: ['カスタムガイドライン']
};

const finalModule = merge(enhancedDialogue, customModule);
```

## カスタムモジュールの作成

独自のモジュールを作成することも可能です：

```typescript
import type { PromptModule } from '@moduler-prompt/core';

interface CustomContext {
  customField: string;
  customData: any[];
}

const customModule: PromptModule<CustomContext> = {
  objective: [
    'カスタム処理の目的を定義'
  ],
  
  instructions: [
    'カスタム処理の指示',
    (context) => {
      // 動的な指示の生成
      if (context.customField === 'special') {
        return {
          type: 'text',
          content: '特別な処理を実行'
        };
      }
      return null;
    }
  ],
  
  materials: [
    (context) => {
      // カスタムデータをマテリアルとして提供
      return context.customData.map(data => ({
        type: 'material' as const,
        title: data.name,
        content: data.content
      }));
    }
  ],
  
  createContext: () => ({
    customField: 'default',
    customData: []
  })
};
```

## ベストプラクティス

### 1. 適切なモジュールの選択

- **単純な処理**: 基本モジュールのみ使用
- **複雑な処理**: 複数モジュールを組み合わせ
- **特殊な要件**: カスタムモジュールを作成

### 2. コンテキストの管理

```typescript
// 必要最小限のコンテキストを提供
const minimalContext = {
  chunks: relevantChunks,
  // 不要なデータは含めない
};

// 段階的にコンテキストを構築
let context = baseContext;
context = { ...context, state: processedState };
context = { ...context, materials: additionalMaterials };
```

### 3. モジュールの再利用

```typescript
// 共通設定をベースモジュールとして定義
const baseConfig: PromptModule<any> = {
  guidelines: ['共通ガイドライン'],
  methodology: ['標準手法']
};

// 用途別に拡張
const analysisModule = merge(baseConfig, analyzeForSummary);
const summaryModule = merge(baseConfig, contentSummarize);
```