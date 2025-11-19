# Agentic Workflow 多言語テスト計画

## 目的

異なるモデルが多言語指示をどのように処理するかを検証し、言語依存性と出力品質を評価する。

## テストケース

### 1. 日本語テストケース
**ファイル**: `test-cases/meal-planning.json`
- **指示言語**: 日本語
- **データ言語**: 日本語
- **期待出力**: 日本語（明示的に指定）

### 2. 英語テストケース
**ファイル**: `test-cases/meal-planning-en.json`
- **指示言語**: 英語
- **データ言語**: 英語
- **期待出力**: 英語（明示的に指定）

## テスト対象モデル

### 優先度1: 詳細テスト
1. **Gemma-3-27b** (`mlx-community/gemma-3-27b-it-qat-4bit`)
   - 理由: 日本語テストで最高の結果
   - テスト: 通常 + freeform、日本語 + 英語

2. **llm-jp-8x13b** (`mlx-community/llm-jp-3.1-8x13b-instruct4-4bit`)
   - 理由: 日本語特化モデルの代表
   - テスト: 通常 + freeform、日本語 + 英語

3. **Qwen-32b** (`mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit`)
   - 理由: 多言語モデル、中国語混入問題の検証
   - テスト: 通常 + freeform、日本語 + 英語

### 優先度2: 追加テスト
4. **Gemma-3n-4b** (`mlx-community/gemma-3n-4b-it-4bit`)
   - 小型モデルとの比較

## テスト実行マトリックス

| モデル | 言語 | 通常モード | freeformモード |
|--------|------|-----------|----------------|
| Gemma-27b | 日本語 | ✅ 完了 | ✅ 完了 |
| Gemma-27b | 英語 | ⏳ 予定 | ⏳ 予定 |
| llm-jp-8x13b | 日本語 | ✅ 完了 | ✅ 完了 |
| llm-jp-8x13b | 英語 | ⏳ 予定 | ⏳ 予定 |
| Qwen-32b | 日本語 | ⏳ 予定 | ✅ 完了 |
| Qwen-32b | 英語 | ⏳ 予定 | ⏳ 予定 |
| Gemma-4b | 日本語 | ✅ 完了 | ⏳ 予定 |
| Gemma-4b | 英語 | ⏳ 予定 | ⏳ 予定 |

## 評価基準

### 1. 言語指示遵守
- ✅ 優秀: 指定言語のみで出力
- ⚠️ 良好: 主に指定言語だが一部混在
- ❌ 不良: 他言語が大量に混入

### 2. タスク遂行度
- ✅ 完全: 全ての指示を正確に実行
- ⚠️ 部分: 一部の指示を無視
- ❌ 失敗: 主要な指示を無視

### 3. 出力品質
- ✅ 高品質: 実用的で詳細な出力
- ⚠️ 標準: 基本的な情報のみ
- ❌ 低品質: 不正確または不完全

### 4. モード別効果
- **通常モード**: 構造化データ出力
- **freeformモード**: 自然文出力の詳細度

## 実行コマンド

### 日本語テスト
```bash
# 通常モード
MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning.json

# freeformモード
FREEFORM_EXECUTION=true MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning.json
```

### 英語テスト
```bash
# 通常モード
MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning-en.json

# freeformモード
FREEFORM_EXECUTION=true MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning-en.json
```

## 結果ファイル命名規則

```
experiments/agentic-workflow-model-comparison/results/
  <model-short-name>-<lang>-<mode>.txt

例:
  gemma-27b-ja-normal.txt
  gemma-27b-ja-freeform.txt
  gemma-27b-en-normal.txt
  gemma-27b-en-freeform.txt
  llm-jp-8x13b-ja-normal.txt
  llm-jp-8x13b-en-freeform.txt
```

## 既存結果のリネーム

```bash
# 既存の日本語結果を統一命名規則に変更
mv gemma-27b.txt gemma-27b-ja-normal.txt
mv gemma-27b-freeform.txt gemma-27b-ja-freeform.txt
mv llm-jp-8x13b.txt llm-jp-8x13b-ja-normal.txt
mv llm-jp-8x13b-freeform-v4.txt llm-jp-8x13b-ja-freeform.txt
mv qwen-32b-freeform.txt qwen-32b-ja-freeform.txt
mv gemma-3n-4b.txt gemma-4b-ja-normal.txt
```

## 分析ポイント

### 1. モデル別特性
- 日本語特化モデル vs 多言語モデル
- モデルサイズの影響（27B vs 4B）

### 2. 言語別パフォーマンス
- 日本語指示の処理能力
- 英語指示の処理能力
- 言語間の一貫性

### 3. モード別効果
- 構造化出力 vs 自然文出力
- 詳細度の違い
- 実用性の違い

## 期待される発見

1. **Gemma-27b**: 両言語で高品質な出力を維持
2. **llm-jp**: 日本語で優秀、英語では性能低下の可能性
3. **Qwen**: 多言語混在のリスク、どの言語で安定するか
4. **サイズ効果**: 27B vs 4Bでの品質差
