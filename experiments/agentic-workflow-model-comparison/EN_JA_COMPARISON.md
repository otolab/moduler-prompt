# 日本語 vs 英語 出力比較分析

## テスト概要

同一のmeal planningタスクを日本語指示と英語指示で実行し、各モデルの言語遵守能力を比較。

## テスト結果サマリー

### Gemma-27b (freeform mode)

| 言語 | 言語指示遵守 | タスク遂行 | 出力品質 | 評価 |
|------|-------------|----------|---------|------|
| 日本語 | ✅ 完璧 | ✅ 完璧 | ⭐⭐⭐⭐⭐ | 詳細な説明付き、調理ポイントまで記載 |
| 英語 | ✅ 完璧 | ✅ 完璧 | ⭐⭐⭐⭐⭐ | 完璧な英語、推論プロセスも記載 |

**主な発見:**
- 言語指示を100%遵守
- 両言語で同等の高品質な出力
- 英語では推論プロセス("Here's my reasoning:")が明示的に表示される傾向
- 日本語では調理のポイントや補足情報が充実

### llm-jp-8x13b (freeform mode)

| 言語 | 言語指示遵守 | タスク遂行 | 出力品質 | 評価 |
|------|-------------|----------|---------|------|
| 日本語 | ❌ 英語混入 | ⚠️ 一部無視 | ⭐⭐⭐ | 英語のセクション名やフィールド名が混入 |
| 英語 | ✅ 完璧 | ✅ 良好 | ⭐⭐⭐⭐ | 完璧な英語、代替案も豊富に提示 |

**主な発見:**
- 日本語指示では英語混入が発生
- 英語指示では完璧な英語出力を維持
- 英語の方が安定した出力品質
- 英語では代替案(Alternative Options)を多数提示

## 詳細比較

### 1. Gemma-27b: 日本語 vs 英語

#### 日本語出力の特徴
```markdown
## 今日の夕飯の献立

今日の夕飯は、**鶏もも肉の唐揚げ**をメインに、以下の献立とします。

*   **主菜:** 鶏もも肉の唐揚げ
*   **副菜:**
    *   キャベツの千切り
    *   人参と玉ねぎの炒め物
    *   もやしとピーマンの和え物
    *   乾燥わかめの味噌汁
*   **ご飯**

**献立のポイント:**
- 冷蔵庫にある材料を最大限に活用しました。
- 過去の献立（カレー、生姜焼き、照り焼き）と重複しないように...

**調理のポイント:**
- 鶏もも肉は、下味をしっかりつけて、ジューシーに仕上げてください。
- キャベツの千切りは、シャキシャキとした食感を残すように...
```

#### 英語出力の特徴
```markdown
Here's my reasoning:

1. **Tofu Stir-fry:** This is relatively quick and easy. It uses a good variety of
   refrigerator ingredients (tofu, cabbage, carrots, bell peppers, bean sprouts).
2. **Egg Drop Soup with Wakame:** This is *very* easy, but might be a bit light...
3. **Pork Belly and Potato Stir-fry:** This uses good ingredients, but we've had
   pork recently...

Considering these factors, **Tofu Stir-fry** seems like the best option.

**Final Decision: Tofu Stir-fry**
```

**比較ポイント:**
- 日本語: 調理のポイント、献立のポイントなど実用的なアドバイスが豊富
- 英語: 推論プロセス(reasoning)が明示的、選択肢の比較検討が詳細
- 両方とも高品質で、言語特性を活かした自然な表現

### 2. llm-jp-8x13b: 日本語 vs 英語

#### 日本語出力での問題点
```text
# Planning Phase

Planning phase - AI generated: {
  "steps": [
    {
      "id": "step-1",
      "description": "Determine tonight's dinner menu",
      ...
```

- JSONフィールド名が英語のまま
- セクションタイトルが英語("Planning Phase", "Execution step")
- 指示は"Output the final result in 日本語"と明記されているが無視

#### 英語出力の成功例
```text
Main Dish:
1. Stir-fried tofu with mixed vegetables: This dish utilizes tofu,
   mixed vegetables, and seasonings such as soy sauce, mirin, and
   vegetable oil.

Alternative Main Dish Options:
1. Chicken and vegetable soup: This dish uses chicken thigh, onions,
   carrots, potatoes, and miso as main ingredients.
2. Pork belly stir-fry with bell peppers and bean sprouts: ...

Alternative Side Dish Options:
1. Roasted vegetables: Roast potatoes, carrots, and bell peppers...
2. Green salad: A light and refreshing side dish...
```

**比較ポイント:**
- 英語指示では完璧な英語出力を維持
- 代替案を豊富に提示(Alternative Options)
- 英語の方が自然で詳細な説明
- 日本語特化モデルだが、英語出力の方が安定

## 重要な発見

### 1. Gemma-27b: 真の多言語モデル
- ✅ 日本語・英語両方で完璧な出力
- ✅ 言語指示を100%遵守
- ✅ 言語特性を活かした自然な表現
- ✅ 両言語で同等の品質

**推奨用途:** 多言語対応が必要なアプリケーション全般

### 2. llm-jp: 英語指示で使用すべき
- ⚠️ 日本語特化だが、日本語出力で英語が混入
- ✅ 英語指示では完璧な英語出力
- ✅ 英語の方が出力品質が安定
- ✅ 代替案提示など、英語での情報量が多い

**推奨用途:** 英語ドキュメント生成、英語でのタスク実行

## テスト実行詳細

### 日本語テスト
```bash
FREEFORM_EXECUTION=true MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning.json
```

### 英語テスト
```bash
FREEFORM_EXECUTION=true MLX_MODEL="<model>" npx tsx packages/process/scripts/test-agentic-workflow.ts test-cases/meal-planning-en.json
```

## 結論

1. **Gemma-27b**: 言語に関係なく高品質な出力。真の多言語モデル。
2. **llm-jp**: 名前に反して英語指示の方が安定。日本語指示では英語混入問題あり。
3. **言語指示の重要性**: モデルの能力だけでなく、プロンプト設計も重要。
4. **Freeform mode**: 詳細な推論プロセスと代替案を確認できる点で有用。

### 3. Qwen-32b: 日本語 vs 英語

#### 日本語出力での問題点
(日本語テスト結果から - 既存の`qwen-32b-ja-freeform.txt`参照)

#### 英語出力の特徴
```text
**T tofu stir-fry with various vegetables**

This dish uses the tofu and available vegetables (cabbage, carrots, bell peppers,
bean sprouts) with soy sauce and vegetable oil. It's a good complement to rice
and provides a balanced meal.

**Final side dish recommendations:**
1. Dried wakame seaweed salad
2. Steamed carrots
3. Steamed potatoes

These complement the tofu stir-fry well and use ingredients not already used in
the main dish.
```

**問題点:**
- 出力が非常に冗長(同じ内容を何度も繰り返す)
- "T tofu"という不自然な表記(Tokenization問題の可能性)
- Step-3で同じ推論を5回以上繰り返している

| 言語 | 言語指示遵守 | タスク遂行 | 出力品質 | 評価 |
|------|-------------|----------|---------|------|
| 日本語 | ? | ? | ? | (未確認) |
| 英語 | ✅ 完璧 | ✅ 完璧 | ⭐⭐⭐ | 冗長だが英語は完璧 |

**比較ポイント:**
- 英語指示では完璧な英語出力を維持
- 出力の冗長性が顕著(効率性に課題)
- Tokenization問題("T tofu"表記)
- 決定プロセスが長く、同じ内容の繰り返しが多い

## 3モデル英語テスト総合比較

### 出力品質ランキング(英語)

1. **Gemma-27b** ⭐⭐⭐⭐⭐
   - 簡潔で明確な推論プロセス
   - 自然な英語表現
   - 適切な情報量

2. **llm-jp-8x13b** ⭐⭐⭐⭐
   - 豊富な代替案提示
   - 完璧な英語
   - やや情報過多だが有用

3. **Qwen-32b** ⭐⭐⭐
   - 英語は完璧
   - 過度に冗長
   - 非効率的な出力

### 言語指示遵守能力

| モデル | 日本語指示 | 英語指示 | 総合評価 |
|--------|-----------|---------|---------|
| Gemma-27b | ✅ 完璧 | ✅ 完璧 | 真のバイリンガル |
| llm-jp | ❌ 英語混入 | ✅ 完璧 | 英語推奨 |
| Qwen-32b | ? | ✅ 完璧 | (日本語要確認) |

### モデル特性まとめ

**Gemma-27b:**
- バランスの取れた多言語モデル
- 両言語で一貫した高品質
- 推論プロセスの明示が優れている

**llm-jp-8x13b:**
- 日本語特化だが英語の方が優秀
- 代替案の豊富さが特徴
- 英語での使用を推奨

**Qwen-32b:**
- 英語出力は言語的に完璧
- 冗長性が課題
- コード特化モデルとしての特性か

## 次のステップ

1. ~~Qwen-32bの英語テストを実行~~ ✅ 完了
2. Qwen-32bの日本語結果との比較分析
3. 通常モード(structured)での言語比較
4. より複雑なタスクでの言語遵守能力の検証
