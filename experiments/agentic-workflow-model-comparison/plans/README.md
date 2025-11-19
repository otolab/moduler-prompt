# Agentic Workflow モデル比較実験

## 実験概要

**目的**: 複数のLLMモデルにおけるagentic workflowの動作を比較評価する

**実験日**: 2025-11-17

**タスク**: 献立計画（Meal Planning）
- 冷蔵庫の材料と過去の献立から、今日の夕飯の献立を検討する
- Planning → Execution → Integration の3フェーズワークフロー

## 評価対象モデル

| モデル名 | パラメータ | データサイズ | 特徴 | 期待される性能 |
|---------|-----------|------------|------|---------------|
| qwq-bakeneko-32b-4bit | 32B | 17GB | 推論特化、思考過程を出力 | 最高 |
| gemma-3-27b-it-qat-4bit | 27B | 16GB | Google製、高性能汎用モデル | 高 |
| llm-jp-3.1-8x13b-instruct4-4bit | 8x13B (MoE) | 38GB | 日本語特化、MoE構造 | 高（日本語） |
| gemma-3n-E4B-it-lm-4bit | 4B (実効) | 3.6GB | 新アーキテクチャ、効率的 | 中〜高 |
| granite-4.0-h-tiny-6bit-MLX | 7B (1B実効, MoE) | 5.3GB | Mamba-Transformer、高速 | 中〜高 |
| granite-4.0-h-1b-4bit | 1B | 0.8GB | IBM製、軽量モデル | 中 |
| gemma-3-270m-it-qat-4bit | 270M | 0.3GB | 超軽量モデル | 低 |

## 評価基準

### 1. タスク完遂度
- [ ] Planning phase: 適切な実行計画を生成できたか
- [ ] Execution phase: 各ステップを正しく実行できたか
- [ ] Integration phase: 結果を適切に統合できたか

### 2. 出力品質
- [ ] 日本語の自然さ
- [ ] 論理的一貫性
- [ ] 実用性（実際に作れる献立か）

### 3. 中間出力の評価
- [ ] 計画の詳細度
- [ ] ステップの適切性
- [ ] 推論過程の明確さ

### 4. パフォーマンス
- [ ] 実行時間
- [ ] トークン使用量
- [ ] メモリ使用量

## テストケース

**入力データ**:
```json
{
  "refrigerator": {
    "proteins": ["鶏もも肉 300g", "豚バラ肉 200g", "卵 6個", "豆腐 1丁"],
    "vegetables": ["キャベツ", "人参", "玉ねぎ 2個", "じゃがいも 3個", "ピーマン", "もやし"],
    "seasonings": ["醤油", "みりん", "酒", "味噌", "サラダ油", "ごま油", "塩", "コショウ"],
    "other": ["ご飯", "乾燥わかめ"]
  },
  "pastMeals": [
    { "date": "昨日", "mainDish": "カレーライス（豚肉・じゃがいも・人参・玉ねぎ）" },
    { "date": "一昨日", "mainDish": "生姜焼き（豚肉・玉ねぎ）" },
    { "date": "3日前", "mainDish": "鶏の照り焼き（鶏もも肉）" }
  ]
}
```

**期待される出力要素**:
1. 今日の主菜候補（冷蔵庫の材料から作れるもの）
2. 過去の献立との重複チェック
3. 副菜の提案
4. 不足材料のリスト（あれば）

## 実行方法

```bash
# 全モデルで実験を実行
cd packages/process
bash scripts/run-meal-planning-experiment.sh

# 個別モデルで実行
MLX_MODEL="mlx-community/gemma-3-27b-it-qat-4bit" \
  npx tsx scripts/test-agentic-workflow.ts
```

## 結果の保存場所

```
experiments/agentic-workflow-model-comparison/results/
├── qwq-bakeneko-32b.txt    # QwQ-Bakeneko 32B の実行結果
├── gemma-27b.txt           # Gemma 27B の実行結果
├── llm-jp-8x13b.txt        # LLM-JP 8x13B の実行結果
├── gemma-3n-4b.txt         # Gemma 3n 4B の実行結果
├── granite-tiny-7b.txt     # Granite Tiny 7B の実行結果
├── granite-1b.txt          # Granite 1B の実行結果
├── gemma-270m.txt          # Gemma 270M の実行結果
└── summary.md              # 比較結果サマリ
```

## 分析項目

### 定量分析
- 実行時間（各フェーズごと）
- 生成トークン数
- プランのステップ数

### 定性分析
- 献立の実用性
- 推論の論理性
- 日本語の品質
- エラーハンドリング

## 次のステップ

1. 実験実行
2. 結果の収集と整理
3. 比較分析
4. レポート作成
5. 改善点の抽出
