# モジュールAPI

## streamProcessing

ストリーム処理用の基本モジュール。状態を維持しながらチャンクを逐次処理します。

```typescript
import { streamProcessing } from '@moduler-prompt/process';

// コンテキスト要件
interface StreamProcessingContext {
  state?: { content: string; usage: number };
  chunks: Array<{ content: string }>;
  range?: { start: number; end: number };
  targetTokens?: number;
}
```

## withMaterials

参考資料をプロンプトに含めるモジュール。

```typescript
import { withMaterials } from '@moduler-prompt/process';

// コンテキスト要件
interface MaterialContext {
  materials?: Array<{
    name: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
}
```

## dialogue モジュール群

対話処理用のモジュール。

- **dialogueBase**: 基本的な対話プロンプト
- **firstOfTwoPassResponse**: 2パス応答の1回目
- **secondOfTwoPassResponse**: 2パス応答の2回目
- **withTalkState**: 会話状態の管理

## summarize モジュール群

要約処理用のモジュール。

- **summarizeBase**: 基本的な要約プロンプト
- **analyzeForSummary**: 要約前の分析
- **contentSummarize**: コンテンツの要約

## 使用例

```typescript
import { merge } from '@moduler-prompt/core';
import { streamProcessing, withMaterials } from '@moduler-prompt/process';

// モジュールの組み合わせ
const module = merge(
  streamProcessing,
  withMaterials,
  myCustomModule
);
```