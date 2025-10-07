# @moduler-prompt/core

プロンプトモジュールフレームワークのコアパッケージ。

## 📚 ドキュメント

### 完全ガイド
パッケージに同梱されている`GUIDE.md`に、Moduler Promptの包括的な仕様書があります。

```bash
# npmでインストール後
cat node_modules/@moduler-prompt/core/GUIDE.md

# またはオンラインで閲覧
# https://github.com/otolab/moduler-prompt/blob/main/docs/COMPLETE_GUIDE.md
```

## インストール

```bash
npm install @moduler-prompt/core
```

## 基本的な使用方法

```typescript
import { compile, createContext, merge } from '@moduler-prompt/core';
import type { PromptModule } from '@moduler-prompt/core';

// モジュール定義
const module: PromptModule = {
  objective: ['タスクの目的'],
  instructions: ['具体的な指示']
};

// コンパイルと実行
const compiled = compile(module);
```

## 主要な機能

- **PromptModule**: 再利用可能なプロンプトテンプレート
- **compile**: モジュールを実行可能な形式に変換
- **merge**: 複数のモジュールを合成
- **createContext**: 動的データの管理

詳細は`GUIDE.md`を参照してください。

## ライセンス

MIT