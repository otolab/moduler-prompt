# @moduler-prompt/process

プロンプトモジュールとワークフローを提供するパッケージ。

## インストール

```bash
npm install @moduler-prompt/process
```

## ワークフロー

- **`streamProcess`** - ステートを保持しながらチャンクを逐次処理
- **`concatProcess`** - 各チャンクを独立して処理し、結果を結合

## モジュール

- **`streamProcessing`** - チャンク単位の逐次処理と状態管理
- **`withMaterials`** - 資料をプロンプトに含める
- **`dialogueモジュール群`** - 対話処理用モジュール
- **`summarizeモジュール群`** - 要約処理用モジュール

## 使用例

```typescript
import { streamProcess } from '@moduler-prompt/process';
import { streamProcessing } from '@moduler-prompt/process';
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver(['response1', 'response2']);

const result = await streamProcess(
  driver,
  streamProcessing,
  {
    chunks: [{ content: 'text1' }, { content: 'text2' }],
    state: { content: '', usage: 0 }
  },
  { tokenLimit: 1000 }
);
```

## ライセンス

MIT