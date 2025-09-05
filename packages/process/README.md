# @moduler-prompt/process

典型的な処理パターンを提供するプロンプトモジュール集。

## インストール

```bash
npm install @moduler-prompt/process
```

## 提供モジュール

### Material モジュール

参考資料を含むプロンプトを構築。

- **`withMaterials`** - 資料をプロンプトに含める
- **`answerWithReferences`** - 資料を参照しながら回答する指示を追加

### Stream Processing モジュール

大規模データを分割して処理するためのモジュール。

- **`streamProcessing`** - チャンク単位の逐次処理と状態管理
  - 前回の処理結果（state）を引き継ぎながら新しいチャンクを処理
  - `targetTokens`設定時は出力サイズを自動制御
  - 初回・最終イテレーションを自動検出して適切な指示を生成

### Stream Workflow

プロンプトモジュールを実際に実行するためのワークフロー。

- **`createStreamWorkflow`** - 処理アルゴリズムとストリーム処理を組み合わせる
- **`StreamProcessor`** - チャンクのバッチ処理とステート管理を実行

## 主要な型

- **`MaterialContext`** - 資料の配列（id, title, content）
- **`StreamProcessingContext`** - ストリーム処理の状態とチャンク
- **`StreamWorkflowContext`** - イテレーション情報を含むワークフロー用コンテキスト

## 使用例

```typescript
import { merge, compile } from '@moduler-prompt/core';
import { withMaterials, streamProcessing } from '@moduler-prompt/process';

// 資料を参照しながらストリーム処理
const module = merge(withMaterials, streamProcessing);

const context = {
  materials: [{ id: 'ref1', title: 'Reference', content: '...' }],
  chunks: [{ content: 'Text to process...' }],
  state: { content: 'Previous result', usage: 200 }
};

const compiled = compile(module, context);
```

## ライセンス

MIT