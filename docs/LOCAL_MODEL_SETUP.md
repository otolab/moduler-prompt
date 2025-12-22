# ローカルモデルセットアップガイド

ローカル環境でAIモデルを実行するための完全ガイド。

## 目次

- [MLX (Apple Silicon)](#mlx-apple-silicon)
  - [環境要件](#環境要件)
  - [初回セットアップ](#初回セットアップ)
  - [テスト用モデルのダウンロード](#テスト用モデルのダウンロード)
  - [任意のモデルのダウンロード](#任意のモデルのダウンロード)
  - [トラブルシューティング](#トラブルシューティング-mlx)
- [Ollama](#ollama)
  - [インストール](#インストール)
  - [サービスの起動](#サービスの起動)
  - [モデルのダウンロード](#モデルのダウンロード-1)
  - [トラブルシューティング](#トラブルシューティング-ollama)

## MLX (Apple Silicon)

Apple Silicon Mac専用の高速ローカルLLM実行環境。

### 環境要件

- **ハードウェア**: Apple Silicon Mac (M1/M2/M3/M4)
- **OS**: macOS
- **Python**: 3.11以上
- **uv**: Pythonパッケージマネージャー（自動インストールされます）

### 初回セットアップ

`@modular-prompt/driver`のインストール時に自動的にセットアップされます：

```bash
npm install @modular-prompt/driver
# postinstallスクリプトが自動的にPython環境をセットアップ
```

手動セットアップが必要な場合：

```bash
cd node_modules/@modular-prompt/driver
npm run setup-mlx
```

**セットアップ内容：**

1. uvパッケージマネージャーのインストール（未インストールの場合）
2. Python仮想環境の作成
3. MLX関連パッケージのインストール

### テスト用モデルのダウンロード

開発・テスト・動作確認用の小型モデルをダウンロードできます：

```bash
cd node_modules/@modular-prompt/driver
npm run download-model
```

**モデル情報：**
- **モデル名**: `mlx-community/gemma-3-270m-it-4bit`
- **サイズ**: 約270MB
- **用途**: 動作確認、開発、ユニットテスト

このモデルは軽量で、MLX環境が正しく動作しているかを確認するのに最適です。

### 任意のモデルのダウンロード

Hugging Face上の任意のMLXモデルをダウンロードできます：

```bash
cd node_modules/@modular-prompt/driver/src/mlx-ml/python
uv run mlx_lm.generate --model <model-name> --prompt "test" --max-tokens 1
```

**例：**

```bash
# Gemma 2B
uv run mlx_lm.generate --model mlx-community/gemma-2-2b-it-4bit --prompt "test" --max-tokens 1

# Llama 3.2 3B
uv run mlx_lm.generate --model mlx-community/Llama-3.2-3B-Instruct-4bit --prompt "test" --max-tokens 1
```

**モデルの保存場所：**

```
~/.cache/huggingface/hub/
```

**注意：**
- 初回実行時にモデルが自動ダウンロードされるため、事前ダウンロードは必須ではありません
- モデルサイズに応じて、ダウンロードに時間がかかる場合があります

### トラブルシューティング (MLX)

#### Python環境が見つからない

```bash
# uvの再インストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# MLX環境の再セットアップ
cd node_modules/@modular-prompt/driver
npm run setup-mlx
```

#### モデルのダウンロードが失敗する

```bash
# キャッシュをクリア
rm -rf ~/.cache/huggingface/hub/

# 再度ダウンロード
npm run download-model
```

#### メモリ不足エラー

より小さいモデル（テスト用の270MBモデルなど）を使用するか、他のアプリケーションを終了してメモリを確保してください。

## Ollama

クロスプラットフォーム対応のローカルLLM実行環境。

### インストール

#### macOS / Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### macOS (Homebrew)

```bash
brew install ollama
```

#### Windows

[ollama.com](https://ollama.com)から Windows版をダウンロードしてインストール。

### サービスの起動

#### macOS (Homebrewでインストールした場合)

```bash
# サービス起動
brew services start ollama
```

#### その他

```bash
# フォアグラウンドで起動
ollama serve
```

#### 起動確認

```bash
# APIが応答するか確認
curl http://localhost:11434/api/tags

# または
ollama list
```

### モデルのダウンロード

Ollamaでモデルを使用するには、事前にダウンロードが必要です：

```bash
# モデルのダウンロード
ollama pull <model-name>

# 例: Llama 3.2のダウンロード
ollama pull llama3.2
```

#### ダウンロード状況の確認

```bash
# ダウンロード済みモデル一覧
ollama list
```

**出力例：**

```
NAME              ID              SIZE    MODIFIED
llama3.2:latest   a80c4f17acd5    2.0 GB  2 hours ago
gemma2:2b         8ccf136fdd52    1.6 GB  1 day ago
```

利用可能なモデルの完全なリストは [ollama.com/library](https://ollama.com/library) を参照してください。

### トラブルシューティング (Ollama)

#### サービスが起動しない

```bash
# プロセスを確認
ps aux | grep ollama

# ポート11434が使用中か確認
lsof -i :11434

# 既存のプロセスを終了して再起動
pkill ollama
ollama serve
```

#### モデルのダウンロードが遅い

ネットワーク接続を確認してください。モデルサイズに応じて、数分から数十分かかる場合があります。

#### メモリ不足

Ollamaはモデルをメモリに読み込むため、モデルサイズの1.5〜2倍のRAMが推奨されます。

## 使用例

### MLX

```typescript
import { MlxDriver } from '@modular-prompt/driver';

const driver = new MlxDriver({
  model: 'mlx-community/gemma-2-2b-it-4bit',
  defaultOptions: {
    max_tokens: 500,
    temperature: 0.7
  }
});

const result = await driver.query(prompt);
console.log(result.content);

await driver.close();
```

### Ollama

```typescript
import { OllamaDriver } from '@modular-prompt/driver';

const driver = new OllamaDriver({
  model: 'llama3.2',
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 500
  }
});

const result = await driver.query(prompt);
console.log(result.content);
```

## 関連ドキュメント

- [Driver APIリファレンス](./DRIVER_API.md)
- [packages/driver/README.md](../packages/driver/README.md)
- [Structured Outputs](./STRUCTURED_OUTPUTS.md)
