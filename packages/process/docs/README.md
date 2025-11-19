# 実験とリサーチ

このディレクトリには、@moduler-prompt/processパッケージに関連する実験やリサーチの記録を保存します。

## 現在の実験

### Agentic Workflow モデル比較実験

プロジェクトルートの`experiments/agentic-workflow-model-comparison/`で実施中。

**目的**:
- 異なるLLMモデルでのワークフロー実行性能の比較
- プロンプト設計の妥当性検証
- モデル固有の最適化の発見

**詳細**:
- [実験ディレクトリ](../../../experiments/agentic-workflow-model-comparison/)
- テストケース: `test-cases/meal-planning.json`
- 実行スクリプト: `packages/process/scripts/test-agentic-workflow.ts`

## 今後の実験候補

- ストリーム処理の最適なチャンクサイズ
- 状態管理戦略の比較
- 異なる対話パターンの評価
