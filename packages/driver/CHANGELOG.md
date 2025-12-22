# @modular-prompt/driver

## 0.4.5

### Patch Changes

- d85ab2d: MLX ドライバーの Python 環境セットアップを修正

  - Python 3.13 に固定（.python-version、setup-mlx.js、pyproject.toml）
  - 不要な test\_\*.py ファイルを削除
  - pyproject.toml に py-modules を明示的に指定して setuptools discovery 問題を解決

## 0.4.4

### Patch Changes

- Updated dependencies [afd3c40]
  - @modular-prompt/core@0.1.9
  - @modular-prompt/utils@0.1.4

## 0.4.3

### Patch Changes

- 9090829: GoogleGenAI driver improvements: Element to Parts/Content mapping and model update

  - Implement proper Element to Parts/Content conversion for Gemini API
  - Map instructions to systemInstruction (Part[]) and data to contents (Content[])
  - Add role conversion: assistant→model, system→user
  - Add integration tests for Element conversion
  - Update default model from gemini-2.0-flash-exp to gemma-3-27b for better stability

## 0.4.2

### Patch Changes

- b049930: package.json に repository フィールドを追加

  Trusted Publisher 使用時の--provenance フラグが repository.url を検証するため、
  driver と simple-chat パッケージに repository フィールドを追加しました。

## 0.4.1

### Patch Changes

- 80d2ec0: v0.4.0 の npm 公開

  - GoogleGenAI（Gemini）ドライバー機能を含む v0.4.0 を npm に公開
  - changeset ベースの自動リリースシステムを使用した最初のリリース
