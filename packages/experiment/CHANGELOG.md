# @modular-prompt/experiment

## 0.1.2

### Patch Changes

- 1f3b383: experiment パッケージの改善

  - evaluator を名前のみで参照可能に（builtin registry 追加）
  - evaluator 名を評価内容を明確に示すようにリネーム
    - json-validator → structured-output-presence
    - functional-correctness → llm-requirement-fulfillment
  - evaluator description を改善し評価結果表示に追加
  - --dry-run オプションを追加（実行計画のみ表示）
  - MLX 使用時にリソース消費の警告を表示
  - README.md に Built-in Evaluators セクションを追加

- cac4dab: リネーム後のクリーンアップ

  - prepublishOnly スクリプトを修正（npm run → pnpm run）
  - リポジトリ URL を新しい名前に更新（moduler-prompt → modular-prompt）
  - experiment パッケージのビルド出力構造を修正（dist/src/ → dist/）
  - パッケージ説明文の修正

- Updated dependencies [cac4dab]
  - @modular-prompt/core@0.1.10
  - @modular-prompt/driver@0.4.6

## 0.1.1

### Patch Changes

- Updated dependencies [d85ab2d]
  - @modular-prompt/driver@0.4.5
