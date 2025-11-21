# Workflow Comparison Experiment

Agentic-workflow と Self-prompting-workflow の比較実験

## 目的

同じタスク（献立作成）を2つの異なるワークフローで実行し、以下を比較する:

1. **プランニング戦略の違い**
   - Agentic: 小さなステップ + ガイドライン/制約
   - Self-prompting: 完全な自己完結型プロンプト

2. **モデルサイズによる性質の変化**
   - Gemma 27B
   - LLM-JP 8x13B

3. **出力品質の違い**
   - 最終的な献立の質
   - ステップ間の一貫性
   - 指示の遵守度

## 実験構成

### テストケース
- **タスク**: 献立作成
- **入力**: 冷蔵庫の材料、過去の献立
- **要件**:
  - 材料から主菜を検討
  - 過去の献立と重複しないようにする
  - 副菜を提案
  - 買い出しリストを作成

### 比較対象

#### Workflow A: Agentic
- 構造化出力（reasoning, result, nextState）
- 小さなステップの積み重ね
- ガイドライン/制約による柔軟な指示

#### Workflow B: Self-prompting
- Freeform出力
- 自己完結型プロンプト
- 前ステップの結果を材料として提供

### テストモデル
1. `mlx-community/gemma-3-27b-it-qat-4bit` (27B)
2. `mlx-community/llm-jp-3.1-8x13b-instruct4-4bit` (8x13B MoE)

## 実行方法

```bash
cd experiments/workflow-comparison
./run-comparison.sh
```

**⚠️ 重要**: MLXモデルは並列実行できません。スクリプトは各テストを順次実行します。
完了まで約15-20分かかります。

## 結果の確認

### 1. 完全な実行ログ
- `results/gemma-27b-agentic.txt`
- `results/gemma-27b-self-prompting.txt`
- `results/llm-jp-8x13b-agentic.txt`
- `results/llm-jp-8x13b-self-prompting.txt`

### 2. 抽出されたプラン
- `plans/gemma-27b-agentic-plan.txt`
- `plans/gemma-27b-self-prompting-plan.txt`
- `plans/llm-jp-8x13b-agentic-plan.txt`
- `plans/llm-jp-8x13b-self-prompting-plan.txt`

## 分析ポイント

### プランニングフェーズ
- [ ] ステップ数の違い
- [ ] ステップの粒度
- [ ] プロンプトの自己完結性

### 実行フェーズ
- [ ] ステップ間の一貫性
- [ ] コンテキストの引き継ぎ
- [ ] 指示の遵守度

### 最終出力
- [ ] 献立の実現可能性
- [ ] 材料の正確な使用
- [ ] 過去の献立との重複チェック
- [ ] 副菜の適切性
- [ ] 買い出しリストの完全性

### モデル特性
- [ ] 27Bと8x13Bの性能差
- [ ] 日本語タスクでの強み/弱み
- [ ] ワークフローとの相性

## 仮説

1. **Agentic-workflow**
   - 小さなステップで段階的に考えるため、論理的な一貫性が高い
   - 構造化出力により、reasoning が明示的
   - ガイドライン/制約により柔軟な調整が可能

2. **Self-prompting-workflow**
   - 自己完結型プロンプトにより、各ステップが独立して実行可能
   - Freeform出力により、より自然な応答
   - 前ステップの結果を材料として明示的に提供

3. **モデルサイズ**
   - 27Bはより複雑な推論に強い
   - 8x13B MoEは効率的だが、一貫性に課題がある可能性

## 次のステップ

結果を分析後、以下を検討:
- [ ] より複雑なタスクでの比較
- [ ] ハイブリッドアプローチの検討
- [ ] モデルごとの最適なワークフロー選択基準の策定
