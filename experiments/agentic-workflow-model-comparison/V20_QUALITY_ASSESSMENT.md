# V20日本語テスト結果 品質評価レポート

## 評価基準

- ⭐⭐⭐⭐⭐ 優秀: 完全な成功、高品質な出力、安定した動作
- ⭐⭐⭐⭐ 良好: 成功、実用的な出力、一部課題あり
- ⭐⭐⭐ 普通: 成功、冗長性や不完全性あり
- ⭐⭐ 問題あり: 成功、重大なロジックエラーや出力途切れ
- ⭐ 重大な問題: 構造的には成功、実用不可
- ❌ 完全失敗: プランニングフェーズで失敗

---

## 1. QwQ-Bakeneko 32B

### v20評価: ⭐⭐⭐ (4ステップ完遂、冗長性と<think>タグ混入)

**ステップ実行状況:**
- Planning Phase: 成功（4ステップ計画生成）
- Execution Phase: 全4ステップ完遂
- Integration Phase: 成功（最終献立提案完了）

**v19からの変化:**
- **改善点:**
  - v19では Planning Phase で JSON生成に失敗（⭐評価）→ v20では成功
  - 各ステップで新しい内容を生成できている
  - 統合フェーズで具体的な献立提案を出力

- **悪化点:**
  - `<think>`タグが出力に混入（プロンプト指示違反）
  - 各ステップで大量の思考プロセスを出力（冗長性）
  - Step 3とStep 4の出力が途中で途切れている

**具体例（良い点）:**
```
主菜候補具体案（Step 2 実行結果）
1. 豆腐の味噌炒め
   - 材料: 豆腐・キャベツ・人参・ごま油・味噌・醤油
   - 手順: 豆腐を切ってごま油で焼き、キャベツと人参を炒め、味噌ダレ（味噌+醤油+水）で煮込む
   - 特徴: 豆腐の食感を活かし、野菜多めで栄養バランス良好
```

**具体例（問題点）:**
- Step 4の出力が途中で途切れ: "豚バラ肉200gが冷蔵庫にあり、過去3日間の豚肉使用量（カ" で終了
- `<think>`タグ内に冗長な思考プロセス（200行以上）

---

## 2. Gemma 27B

### v20評価: ⭐⭐⭐⭐⭐ (4ステップ完遂、高品質な出力)

**ステップ実行状況:**
- Planning Phase: 成功（4ステップ計画生成、JSON形式正しく出力）
- Execution Phase: 全4ステップ完遂
- Integration Phase: 成功（詳細な献立提案）

**v19からの変化:**
- **変化なし（両バージョンとも高評価）:**
  - v19: ⭐⭐⭐⭐⭐ → v20: ⭐⭐⭐⭐⭐
  - 安定した高品質な出力を維持

**特筆すべき点:**
- 前ステップの内容を適切に参照しながら新しい内容を生成
- 過去献立との重複回避を明示的に記載
- 買い出しリスト作成の指示を完全に実行（「特になし」と明確に回答）
- 調理手順まで具体的に記載

**具体例:**
```
最終献立案
主菜: 卵と野菜の炒め物 (キャベツ、人参、玉ねぎ、ピーマン、卵)
副菜: もやしとわかめの和え物 (もやし、乾燥わかめ)
買い出しリスト: 特になし

献立のポイント:
- 冷蔵庫にある材料で完結
- 調理時間の短縮: 短時間で簡単に作れます
- 栄養バランスの確保: タンパク質、炭水化物、ビタミン・ミネラルをバランス良く摂取
- 過去の献立との重複回避: 昨日のカレーライス、一昨日の生姜焼き、3日前の鶏の照り焼きを踏まえ、卵を使った料理を選定
```

---

## 3. Granite Tiny 7B

### v20評価: ⭐⭐⭐ (4ステップ完遂、全ステップ同一出力問題継続)

**ステップ実行状況:**
- Planning Phase: 成功（4ステップ計画生成）
- Execution Phase: 全4ステップ完遂
- Integration Phase: 成功

**v19からの変化:**
- **変化なし（両バージョンとも同一問題）:**
  - v19: ⭐⭐⭐ → v20: ⭐⭐⭐
  - Step 1～4で完全に同一の出力を繰り返す問題が継続

**問題点:**
- Step 1で「鶏もも肉を使った甘酢あんかけ」を提案
- Step 2, 3, 4でも全く同じ内容を繰り返し出力
- "Produce only NEW content for this step" の指示を無視
- "Do NOT copy or reproduce the previous outputs" の指示を無視

**具体例（全ステップで同一）:**
```
Main Dish: Chicken Stir-Fry (鶏もも肉を使った炒め物)
- Use the chicken breast from the refrigerator.
- Add vegetables such as onions, bell peppers, and mushrooms for variety.
- Season with soy sauce, mirin, and a bit of salt and pepper.

Side Dish: Rice (ご飯)
- Prepare a standard portion of rice to accompany the main dish.
```

---

## 4. LLM-JP 8x13B

### v20評価: ⭐⭐⭐⭐ (4ステップ完遂、実用的な出力)

**ステップ実行状況:**
- Planning Phase: 成功（4ステップ計画生成）
- Execution Phase: 全4ステップ完遂
- Integration Phase: 成功

**v19からの変化:**
- **改善点:**
  - v19: ⭐⭐⭐ (3ステップ、冗長性あり) → v20: ⭐⭐⭐⭐ (4ステップ、実用的)
  - ステップ数が3→4に増加（より詳細な計画）
  - 冗長性が大幅に減少
  - 各ステップで適切に新しい内容を生成

**特筆すべき点:**
- 過去献立との重複を適切に分析
- 鶏もも肉の生姜焼きを提案（3日前の鶏の照り焼きとは異なる調理法）
- 買い出しリストで不足材料を正確に特定（鶏もも肉、冷ご飯）
- 日本語と英語の混在（モデルの言語処理特性）

**具体例:**
```
Today's dinner menu:
- Main dish: 鶏もも肉の生姜焼き (chicken thighs with ginger sauce)
- Side dish: Fried Rice (with cold rice, eggs, mixed vegetables, soy sauce, and sesame oil)

Shopping list:
- Chicken thighs
- Cold rice

This solution ensures that we make a balanced and delicious dinner while avoiding similar dishes within the last three days and considering the current state of the refrigerator.
```

---

## 5. Gemma 4B

### v20評価: ⭐⭐⭐⭐ (3ステップ完遂、コンパクトで実用的)

**ステップ実行状況:**
- Planning Phase: 成功（3ステップ計画生成）
- Execution Phase: 全3ステップ完遂
- Integration Phase: 成功

**v19からの変化:**
- **改善点:**
  - v19: ⭐⭐⭐ (4ステップ、前ステップ大量引用) → v20: ⭐⭐⭐⭐ (3ステップ、コンパクト)
  - 前ステップの不適切な引用がほぼ解消
  - 出力が簡潔で実用的

**特筆すべき点:**
- 3ステップのシンプルな計画（主菜選定→副菜選定→買い出し）
- 各ステップで適切に新しい内容を生成
- 過去献立との重複を回避（鶏もも肉の甘酢あんかけを選定）
- 買い出しリストで不足材料を正確に特定（ほうれん草、わかめ）

**具体例:**
```
今日の夕飯の献立は、鶏もも肉を使った甘酢あんかけ、ほうれん草のごま和え、豆腐とわかめの味噌汁としました。

買い物リスト:
- ほうれん草
- わかめ

選定理由:
鶏もも肉を使った甘酢あんかけは、冷蔵庫にある材料で簡単に作ることができ、過去の献立（カレーライス、生姜焼き、鶏の照り焼き）と異なるため、献立のバリエーションを確保しました。
```

---

## 6. Granite 1B

### v20評価: ❌ (Planning Phase完全失敗)

**ステップ実行状況:**
- Planning Phase: 完全失敗（パン作りの手順を生成）
- Execution Phase: 意味のない実行（Step 2以降「情報不足」エラー）
- Integration Phase: 失敗

**v19からの変化:**
- **悪化:**
  - v19: ⭐⭐ (4ステップ、重複と冗長性あるが一応成功) → v20: ❌ (完全失敗)
  - Planning Phaseで献立計画ではなく「パン作り」の手順を生成
  - 入力データを完全に無視

**問題点:**
- "Gather necessary ingredients and equipment" → パン作りの材料リスト
- "Prepare the dough" → パン生地の準備
- "Let the dough rise" → 生地の発酵
- "Shape the dough" → 生地の成形
- "Preheat the oven" → オーブン予熱

**具体例（誤った出力）:**
```json
{
  "steps": [
    {
      "id": "step-1",
      "description": "Gather necessary ingredients and equipment",
      "guidelines": [
        "List all required ingredients from the menu",
        "Check if any ingredients are out of stock",
        "Verify that all equipment is available and in working order"
      ],
      "actions": [
        {
          "tool": "shopping",
          "params": {
            "items": ["flour", "sugar", "baking powder", "salt", "pepper", "eggs", "milk", "vegetable oil", "baking soda"]
          }
        }
      ]
    }
  ]
}
```

---

## 7. Gemma 270M

### v20評価: ❌ (Planning Phase完全失敗)

**ステップ実行状況:**
- Planning Phase: 完全失敗（無限ループのような出力）

**v19からの変化:**
- **変化なし（両バージョンとも完全失敗）:**
  - v19: ❌ → v20: ❌
  - Planning Phaseで構造化されたJSONを生成できず

**問題点:**
- "The code will be executed with a set of instructions." の無限繰り返し
- 約50回同じフレーズを繰り返して出力終了
- JSON形式の出力を完全に無視

**具体例（誤った出力）:**
```
## Task: Execution Plan
The following task is to create a Python script that will execute a set of Python code snippets...
- The code will be executed with a set of instructions.
- The code will be executed with a set of instructions.
- The code will be executed with a set of instructions.
[約50回繰り返し]
```

---

## 総合評価とランキング

### v20評価ランキング

1. **Gemma 27B**: ⭐⭐⭐⭐⭐ - 安定した高品質出力、v19から変化なし
2. **Gemma 4B**: ⭐⭐⭐⭐ - コンパクトで実用的、v19から大幅改善
3. **LLM-JP 8x13B**: ⭐⭐⭐⭐ - 実用的な出力、v19から改善
4. **QwQ-Bakeneko 32B**: ⭐⭐⭐ - 冗長性あるが成功、v19から大幅改善
5. **Granite Tiny 7B**: ⭐⭐⭐ - 同一出力問題継続、v19から変化なし
6. **Granite 1B**: ❌ - 完全失敗、v19から悪化
7. **Gemma 270M**: ❌ - 完全失敗、v19から変化なし

### v19→v20の主な変化

**大幅改善:**
- **QwQ-Bakeneko 32B**: ⭐ → ⭐⭐⭐（Planning成功、実用レベルに到達）
- **Gemma 4B**: ⭐⭐⭐ → ⭐⭐⭐⭐（前ステップ引用問題解消）
- **LLM-JP 8x13B**: ⭐⭐⭐ → ⭐⭐⭐⭐（冗長性減少、実用性向上）

**変化なし:**
- **Gemma 27B**: ⭐⭐⭐⭐⭐ → ⭐⭐⭐⭐⭐（安定した高品質）
- **Granite Tiny 7B**: ⭐⭐⭐ → ⭐⭐⭐（同一出力問題継続）
- **Gemma 270M**: ❌ → ❌（完全失敗継続）

**悪化:**
- **Granite 1B**: ⭐⭐ → ❌（Planning失敗、タスク理解崩壊）

---

## 主要な問題パターン

### 1. プランニングフェーズの失敗
- **Granite 1B**: タスク理解の完全な失敗（パン作り手順生成）
- **Gemma 270M**: JSON生成能力の欠如（無限ループ）

### 2. 指示違反
- **QwQ-Bakeneko 32B**: `<think>`タグの混入
- **Granite Tiny 7B**: "Do NOT copy" 指示の無視

### 3. 出力途切れ
- **QwQ-Bakeneko 32B**: Step 3, 4で途中終了

### 4. 言語混在
- **LLM-JP 8x13B**: 日本語/英語の混在（"最終的な出力は日本語で行うこと"の部分的無視）

---

## v20プロンプトの有効性

**効果があったモデル:**
- QwQ-Bakeneko 32B: Planning成功率向上
- Gemma 4B: 前ステップ引用問題の解消
- LLM-JP 8x13B: 冗長性の減少

**効果がなかったモデル:**
- Granite Tiny 7B: 同一出力問題継続
- Granite 1B: タスク理解の崩壊
- Gemma 270M: JSON生成能力不足

**結論:**
v20プロンプトは中規模以上のモデル（4B以上）には有効だが、極小モデル（270M～1B）には不十分。
