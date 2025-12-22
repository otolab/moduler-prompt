# 作業進捗メモ - 2025-01-18

## 現在の状況

### 作業内容
Agentic Workflowのfreeformモードにおいて、Step 2以降が前ステップの結果を適切に使用しない問題の修正。

### 問題の経緯

1. **発見した問題**
   - Step 2の指示: "選ばれた主菜に合う副菜を提案する"
   - 実際の動作: 主菜を再度選択（Step 1の作業を繰り返す）

2. **原因調査**
   - simple-chatとチャットログ機能（`-l`オプション）を使用してllm-jpモデルに深掘り質問
   - 初回質問: プロンプトと結果を提示 → モデル「問題なし」と評価
   - 継続質問: 「実際には主菜を再選択している、なぜ？」

3. **llm-jpの診断結果**（深掘り質問後）
   ```
   指示が曖昧：「Propose suitable side dishes that complement the chosen main dish」
   という指示は、AIが既に主菜を決定していると誤解する可能性があります。
   より明確な指示として、「Given the chosen main dish (from Previous step result),
   propose suitable side dishes」のように、主菜がどこにあるかを明示すると良いでしょう。
   ```

4. **根本原因**
   - "the chosen main dish"がどこにあるか（Previous step result）を明示していない
   - モデルは主菜がまだ選ばれていないと解釈
   - セクションフォーマットの問題ではなく、**前ステップ結果の使用方法の指示が不足**

### 実施した修正

#### ファイル: `packages/process/src/workflows/agentic-workflow/modules/execution-freeform.ts`

**修正内容**: 実行フェーズに動的な指示を追加

```typescript
instructions: [
  (ctx: AgenticWorkflowContext) => {
    const items: string[] = [
      '- Focus on the current step instructions only',
      '- Perform sufficient processing for this step',
      '- Concise output is acceptable if appropriate for the step',
      '- Do NOT execute instructions from other steps'
    ];

    // Add previous step result usage instruction if available
    if (ctx.executionLog && ctx.executionLog.length > 0) {
      items.push('');
      items.push('**CRITICAL: Use Previous Step Results**');
      items.push('- Previous step results are shown in the "Data" section below');
      items.push('- You MUST reference and use the decisions/outputs from previous steps');
      items.push('- Do NOT redo or repeat what previous steps have already accomplished');
      items.push('- Your current step should continue from where the previous step left off');
    }

    return items;
  },
  // ... subsections follow
]
```

**ポイント**:
- Step 1では追加指示なし（executionLogが空）
- Step 2以降で自動的に「CRITICAL: Use Previous Step Results」セクションが表示
- 「MUST」などの強い言葉で明示的に指示

**v8フォーマット維持**:
```typescript
methodology: [
  '',
  '**Current Phase: Execution**',
  '',
  '- Execute only the current step of the execution plan.',
  '- Follow the dos/donts specified in the plan.',
  '- Output the reasoning process and results as natural text.'
],
```

### コミット履歴

**Commit**: 8c5e017
```
feat(agentic-workflow): 実行フェーズで前ステップ結果使用を明示的に指示

Step 2以降が前ステップの結果を無視して作業をやり直す問題に対処。
実行時に「前のステップ結果を必ず使用すること」を明示的に指示する
動的コンテンツを追加。

Changes:
- execution-freeform.tsのinstructionsに動的コンテンツ追加
- executionLogが存在する場合（Step 2以降）に以下を表示:
  - 前ステップ結果がDataセクションにあることを明示
  - 前ステップの決定/出力を参照・使用することを義務付け
  - 前ステップの作業を繰り返さないことを指示
  - 前ステップから継続して作業することを明記
```

### 検証ドキュメント

**ファイル**: `docs/PROMPT_VALIDATION_TECHNIQUES.md`

チャットログを使った深掘り質問の手法を追加:
- `-l`オプションによるチャットログ継続
- 初回質問で不十分な場合の追加質問パターン
- llm-jpでの実際の成功例を記載

### 次のステップ

**未検証**: 修正後のテスト実行

```bash
# ビルドして検証
npm run build -w @modular-prompt/process
FREEFORM_EXECUTION=true MLX_MODEL="mlx-community/llm-jp-3.1-8x13b-instruct4-4bit" \
  npx tsx packages/process/scripts/test-agentic-workflow.ts
```

**期待される動作**:
- Step 2で主菜を再選択しない
- Step 1で決定した「鶏と野菜の甘酢炒め」を前提に副菜を提案

## 関連ファイル

- `packages/process/src/workflows/agentic-workflow/modules/execution-freeform.ts` - 修正実施
- `packages/process/src/workflows/agentic-workflow/modules/planning.ts` - 確認のみ（修正不要と判断）
- `packages/process/src/workflows/agentic-workflow/modules/agentic.ts` - v8フォーマット確認
- `docs/PROMPT_VALIDATION_TECHNIQUES.md` - 検証手法ドキュメント
- `experiments/agentic-workflow-model-comparison/results/llm-jp-8x13b-ja-freeform-v10.txt` - 問題発生時の実行結果
- `/tmp/llm-jp-followup.txt` - 深掘り質問の会話ログ

## 技術的知見

### プロンプト検証の重要性
1. モデル自身に「何をすべきか」を説明させることで、理解のギャップを発見
2. チャットログ継続により、初回で問題を認識できなかった場合でも追加質問で深掘り可能
3. メタ認知モード（プロンプト分析）と実行モード（タスク実行）の違いを理解

### 修正アプローチの選択
- アプローチ1: Planning段階で「ステップ間の依存関係」を指示 → 不安定と判断
- アプローチ2: Execution段階で「前ステップ結果を使用」を明示 → 採用

理由: Planning段階でのメタ指示は不安定。実行時の具体的指示の方が確実。

## 参考リンク

- [プロンプト検証テクニック](./PROMPT_VALIDATION_TECHNIQUES.md)
- [Simple Chat README](../packages/simple-chat/README.md)
- Commit: 8c5e017
