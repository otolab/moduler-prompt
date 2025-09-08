# Simple Chat - サンプル実装

Moduler Promptフレームワークを使用したチャットアプリケーションのサンプル実装です。実際のアプリケーションでフレームワークをどのように使用するかを示すリファレンス実装として提供されています。

## 概要

このパッケージは以下を実演します：
- PromptModuleの静的定義とコンテキストバインディング
- `merge`を使用したモジュール合成（`withMaterials`の活用）
- MLXドライバーを使用したAIモデルとの対話
- チャットログの管理とリソースファイルの処理

## インストール

```bash
npm install @moduler-prompt/simple-chat
```

## 使用方法

### CLIとして使用

```bash
# 直接メッセージを送信
simple-chat "こんにちは"

# プロファイルを指定
simple-chat -p profile.yaml "質問があります"

# チャットログを保存
simple-chat -l chat.json "会話を続けます"
```

### ライブラリとして使用

```typescript
import { chatPromptModule, performAIChat } from '@moduler-prompt/simple-chat';
```

## 実装のポイント

このサンプル実装では、Moduler Promptフレームワークの主要な機能を実際のアプリケーションで活用する方法を示しています：

1. **静的なモジュール定義**: `chatPromptModule`は静的に定義されたテンプレート
2. **モジュールの合成**: `@moduler-prompt/process`の`withMaterials`モジュールとの合成
3. **型安全なコンテキスト**: `ChatContext`による型定義
4. **段階的なデータバインディング**: createContext → データ設定 → compile

詳細は[プロンプトモジュール仕様書](../../docs/PROMPT_MODULE_SPECIFICATION.md)の実装例セクションを参照してください。