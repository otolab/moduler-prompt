---
"@modular-prompt/experiment": minor
---

ビルトインevaluatorシステムの実装

- evaluatorを名前のみで参照可能に（builtin registry追加）
- evaluator名を評価内容を明確に示すようにリネーム
  - json-validator → structured-output-presence
  - functional-correctness → llm-requirement-fulfillment
- README.mdにBuilt-in Evaluatorsセクションを追加
