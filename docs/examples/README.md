# Examples

Moduler Promptフレームワークの使用例とサンプル設定ファイル。

## 設定ファイル

### driver-registry-config.yaml

DriverRegistryで使用するドライバ設定ファイルのサンプル。以下の内容を含む：

- **MLXローカルモデル**：Gemma、Llama、QWQ、Tanukiなどのローカル実行可能なモデル
- **OpenAI**：GPT-4o、GPT-4o-miniなどのクラウドモデル
- **Anthropic**：Claude 3.5 Sonnet、Haikuなどのモデル
- **VertexAI**：Gemini 2.0 Flashなどのモデル

各モデルには以下の情報が定義されている：
- 能力（capabilities）：streaming、local、japanese、codingなど
- トークン制限：入力・出力の最大トークン数
- コスト情報：1Kトークンあたりのコスト
- 優先度：自動選択時の優先順位

## 使用方法

1. `driver-registry-config.yaml`をプロジェクトにコピー
2. 必要に応じてモデル設定をカスタマイズ
3. DriverRegistryで読み込んで使用

```typescript
import { DriverRegistry } from '@moduler-prompt/utils';

const registry = new DriverRegistry();
await registry.loadConfig('./my-drivers.yaml');

// 自動選択
const driver = await registry.selectAndCreateDriver(
  ['japanese', 'chat'],
  { preferLocal: true }
);
```

## 設定のカスタマイズ

### APIキーの設定

環境変数で設定：
```bash
export OPENAI_API_KEY=your-api-key
export ANTHROPIC_API_KEY=your-api-key
export VERTEX_AI_PROJECT=your-project
export VERTEX_AI_LOCATION=us-central1
```

または設定ファイル内で指定：
```yaml
drivers:
  - id: custom-gpt
    model:
      provider: openai
      # ...
    credentials:
      apiKey: ${OPENAI_API_KEY}  # 環境変数を参照
```

### カスタムモデルの追加

```yaml
drivers:
  - id: my-custom-model
    name: My Custom Model
    model:
      model: custom-model-name
      provider: mlx
      capabilities:
        - local
        - japanese
        - specialized-task
      maxInputTokens: 16384
      maxOutputTokens: 4096
      priority: 25
```

## サンプルアプリケーション

実際の動作例は `packages/simple-chat` パッケージを参照。