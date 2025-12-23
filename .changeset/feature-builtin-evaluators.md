---
"@modular-prompt/experiment": patch
---

experimentパッケージの改善

- evaluatorを名前のみで参照可能に（builtin registry追加）
- evaluator名を評価内容を明確に示すようにリネーム
  - json-validator → structured-output-presence
  - functional-correctness → llm-requirement-fulfillment
- evaluator descriptionを改善し評価結果表示に追加
- --dry-runオプションを追加（実行計画のみ表示）
- MLX使用時にリソース消費の警告を表示
- README.mdにBuilt-in Evaluatorsセクションを追加
