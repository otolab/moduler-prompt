# プロンプト検証テクニック

プロンプト設計の問題を特定し、改善するための実践的な検証手法。

## 概要

プロンプトの品質を評価する際、人間の主観的判断だけでなく、AIモデル自身に分析させることで、より深い洞察を得ることができます。

## 検証手法

### 1. セクションフォーマット選好調査

**目的**: どのセクションフォーマットがAIにとって最も明確かを確認する

**方法**: 複数のフォーマットを提示し、AIに評価させる

**実施例**:
```bash
# simple-chatを使用してモデルに質問
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml "
以下の3つのセクションフォーマットについて、どれが最も「このセクションは参照データであり、
実行すべき指示ではない」ということを明確に伝えられると思いますか？

フォーマット1:
# Data
The following contains data for processing.

フォーマット2:
Data
====
The following contains data for processing.

フォーマット3:
<data>
The following contains data for processing.
</data>
"
```

**結果の解釈**:
- モデルの認知的な視点を理解できる
- 人間の直感と異なる場合がある
- フォーマット選択の根拠を明確化できる

**実際の知見** (llm-jp-3.1-8x13b-instruct4-4bit):
- `# Data`形式が最も明確と評価
- 理由: 見出しと本文が明確に分離、`#`記号が重要なセクションであることを示唆
- `====`形式: 視覚的に混同しやすい
- `<data>`形式: 視覚的に強調されるが冗長、特定言語への依存

### 2. 失敗ケース分析

**目的**: プロンプトの問題点をAI自身に診断させる

**方法**:
1. 失敗したプロンプトと実際の生成結果を提示
2. AIに「何をするべきか」と「問題の有無」を分析させる

**質問テンプレート**:
```
以下のプロンプトと生成結果を見てください。
このプロンプトでAIは何をするべきだと思いますか？
そして、実際の生成結果は期待通りですか？
もし問題があれば、その理由を教えてください。

---prompt---
[失敗したプロンプト全文]

---生成結果---
[実際の生成結果]
```

**実施例**:
```bash
# 質問をファイルに保存
cat > /tmp/failed-prompt-question.txt << 'EOF'
[質問内容]
EOF

# simple-chatで分析
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml --stdin < /tmp/failed-prompt-question.txt

# チャットログを使って会話を継続し、深掘り質問
# 初回質問（ログを作成）
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml -l /tmp/chat.json --stdin < /tmp/failed-prompt-question.txt

# 継続質問（同じログファイルを指定）
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml -l /tmp/chat.json "でも、実際には生成結果に問題があります。プロンプトの指示は「Propose suitable side dishes that complement the chosen main dish（選ばれた主菜に合う副菜を提案する）」ですが、生成結果では主菜を再度選択しています。

なぜAIは「Previous step result」に既に主菜が決まっているのに、それを無視して主菜を再度選択したのでしょうか？プロンプトのどこに問題があると思いますか？"
```

**結果の解釈**:
- **問題を認識できた場合**: プロンプトの改善ポイントが明確
- **問題を認識できない場合**: より根本的な設計問題の可能性
  - 指示が暗黙的すぎる
  - 前提知識の欠如
  - セクション間の関連性が不明確

**実際の知見** (agentic-workflow Step 2での失敗):
- **期待**: Previous step resultを使って副菜を提案
- **実際**: 主菜を再度選択（Step 1の繰り返し）
- **初回質問での診断**: 「適切な結果」と評価（問題を認識せず）
- **継続質問で深掘り**: チャットログを使って「なぜ主菜を再選択したのか」と追加質問
- **深掘り後の診断結果**:
  - 指示が曖昧：「Propose suitable side dishes that complement the chosen main dish」という表現では、AIが既に主菜を決定していると誤解する可能性
  - より明確な指示として「Given the chosen main dish (from Previous step result), propose suitable side dishes」のように、主菜がどこにあるかを明示すべき
- **根本原因**:
  - "the chosen main dish"がどこにあるか（Previous step result）を明示していない
  - モデルは主菜がまだ選ばれていないと解釈
  - セクションフォーマットの問題ではなく、**前ステップ結果の使用方法の指示が不足**

## 使用ツール

### simple-chat

Moduler Promptフレームワークを使用したCLIツール。

**基本的な使い方**:
```bash
# 直接質問
npx tsx packages/simple-chat/src/cli.ts "質問内容"

# プロファイルを指定
npx tsx packages/simple-chat/src/cli.ts -p /path/to/profile.yaml "質問内容"

# 標準入力から読み込み
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml --stdin < question.txt

# チャットログを保存・継続
npx tsx packages/simple-chat/src/cli.ts -l chat.json "会話を続けます"
```

**プロファイル作成例**:
```yaml
model: "mlx-community/llm-jp-3.1-8x13b-instruct4-4bit"
driver: "mlx"
systemPrompt: |
  あなたはプロンプトエンジニアリングの専門家です。
  プロンプト設計やフォーマットに関する質問に答えてください。
  日本語で応答してください。
options:
  temperature: 0.3  # 分析的タスクには低めの温度
  maxTokens: 4000
```

## ベストプラクティス

### 1. 複数モデルでの検証

異なるモデルで同じ検証を行い、結果を比較する。
- モデル固有の傾向を識別
- 汎用的な問題と特定モデルの問題を区別

### 2. 段階的な質問

一度に全てを聞くのではなく、段階的に質問する。
1. フォーマット選好調査 → セクション設計の妥当性確認
2. 失敗ケース分析 → 具体的な問題点の特定
3. 改善案の検証 → 修正の効果確認

### 3. チャットログを活用した深掘り質問

モデルの初回回答が不十分な場合、チャットログを使って会話を継続し深掘りする。

**メリット**:
- 前の質問と回答のコンテキストを維持
- 段階的に詳細な質問が可能
- モデルの認識のギャップを発見しやすい

**実施パターン**:
```bash
# 1. 初回質問（ログファイルを指定）
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml -l /tmp/analysis.json "プロンプトXについて評価してください"

# 2. モデルの回答を確認

# 3. 不十分な点について追加質問（同じログファイル）
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml -l /tmp/analysis.json "でも実際にはYという問題があります。なぜそうなったと思いますか？"

# 4. さらに深掘り（何度でも継続可能）
npx tsx packages/simple-chat/src/cli.ts -p profile.yaml -l /tmp/analysis.json "その原因を踏まえて、どう改善すべきですか？"
```

**成功例**:
- 初回質問: プロンプトと結果を提示 → モデル「問題なし」と評価
- 継続質問: 「実際には主菜を再選択している、なぜ？」→ モデルが根本原因を特定
- この深掘りにより、セクションフォーマットではなく指示文の曖昧さが問題だと判明

### 4. 結果の記録

検証結果を体系的に記録する。
- プロンプトバージョン
- 使用モデル
- 検証結果
- 得られた知見

**記録場所の例**:
```
experiments/
  agentic-workflow-model-comparison/
    results/
      llm-jp-8x13b-ja-freeform-v8.txt  # 実行結果
    analysis/
      format-preference-llm-jp.txt      # フォーマット選好調査
      failure-analysis-step2-llm-jp.txt # 失敗ケース分析
```

## 応用例

### ケース1: マルチステップワークフローの検証

**課題**: 各ステップが前のステップの結果を適切に使用しているか

**検証方法**:
1. 各ステップのプロンプトを個別に提示
2. 前ステップの結果の使用方法が明確か確認
3. 失敗ケースでは、どこで理解が途切れるか診断

### ケース2: 指示の明確性確認

**課題**: 暗黙の前提が多すぎないか

**検証方法**:
1. プロンプトだけを提示し、AIに「何をすべきか」を説明させる
2. 説明内容と意図したタスクのギャップを確認
3. 不足している明示的指示を特定

### ケース3: セクション区切りの効果測定

**課題**: データセクションが指示として誤解されていないか

**検証方法**:
1. 異なるセクションフォーマットで同じ内容を提示
2. 各フォーマットでの理解度を比較
3. モデル自身にどれが最も明確か評価させる

## 注意点

### 1. モデルの自己認識の限界

モデルは自身の振る舞いを完全に説明できない場合がある。
- 実際の生成では失敗するが、分析では正しい答えを出すことがある
- 逆に、正しく生成できても、理由を説明できない場合がある

### 2. コンテキストの違い

検証用の質問と実際のタスク実行では、コンテキストが異なる。
- 検証時: メタ認知モード（プロンプトについて考える）
- 実行時: タスク実行モード（プロンプトに従う）

### 3. バイアスの可能性

モデルは人間の期待に沿った回答をする傾向がある。
- 質問の仕方によって回答が変わる可能性
- 複数の質問方法で確認することを推奨

## まとめ

プロンプト検証は、人間の主観的評価とAIの自己分析を組み合わせることで、より効果的になります。

**キーポイント**:
1. **simple-chat**を使用してモデルに直接質問できる
2. **フォーマット選好調査**でセクション設計の妥当性を確認
3. **失敗ケース分析**で根本原因を特定
4. **チャットログ（-l オプション）** で会話を継続し、深掘り質問が可能
5. モデルが問題を認識できない場合、継続質問で追加の視点を引き出す
6. 複数モデル、複数アプローチでの検証を推奨

## 関連ドキュメント

- [Simple Chat README](../packages/simple-chat/README.md)
- [Process Module Guide](./PROCESS_MODULE_GUIDE.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
