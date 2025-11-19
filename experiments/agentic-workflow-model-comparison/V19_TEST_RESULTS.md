# Agentic Workflow v19 Test Results

## テスト概要

**実施日**: 2025-11-18
**テスト対象**: execution-freeform.ts v19の改善版
**主な変更点**: Requirements セクションの表現を "Analyze and Explain" から "Read and understand" に変更

### v19での修正内容

```typescript
// 修正前 (v18)
items.push('- Analyze the previous step\'s proposals/decisions');
items.push('- Explain how they relate to THIS step\'s task');

// 修正後 (v19)
items.push('- Read and understand the previous step\'s decisions (shown in Data section below)');
items.push('- Use that understanding to complete THIS step\'s task');
items.push('- Produce only NEW content for this step');
items.push('- Do NOT copy or reproduce the previous outputs');
```

## テスト結果サマリー

| モデル | サイズ | 日本語 | 英語 | 備考 |
|--------|--------|--------|------|------|
| llm-jp-3.1-8x13b-instruct4-4bit | 13B | ✅ 4 steps | ✅ 5 steps | 両言語で成功 |
| gemma-3-27b-it-qat-4bit | 27B | ✅ 4 steps | ✅ 4 steps | 両言語で成功 |
| gemma-3-12b-it-qat-4bit | 12B | ✅ 4 steps | ✅ 4 steps | 両言語で成功 |
| gemma-3n-E4B-it-lm-4bit | 4B | ✅ 3 steps | ✅ 4 steps | 両言語で成功 |

### 成功率

- **テスト成功率**: 8/8 (100%)
- **全モデル**: v19の改善により、ステップ再現問題が解決

## 詳細結果

### llm-jp-3.1-8x13b-instruct4-4bit

**日本語テスト** (`llm-jp-8x13b-ja-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

**英語テスト** (`llm-jp-8x13b-en-freeform-v19.txt`)
- Plan Steps: 5
- Executed Steps: 5
- Status: ✅ Completed successfully

### gemma-3-27b-it-qat-4bit

**日本語テスト** (`gemma-27b-ja-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

**英語テスト** (`gemma-27b-en-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

### gemma-3-12b-it-qat-4bit

**日本語テスト** (`gemma-12b-ja-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

**英語テスト** (`gemma-12b-en-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

### gemma-3n-E4B-it-lm-4bit

**日本語テスト** (`gemma-4b-ja-freeform-v19.txt`)
- Plan Steps: 3
- Executed Steps: 3
- Status: ✅ Completed successfully

**英語テスト** (`gemma-4b-en-freeform-v19.txt`)
- Plan Steps: 4
- Executed Steps: 4
- Status: ✅ Completed successfully

## 主要な発見

### 1. v19の改善効果

v19での "Read and understand" アプローチは、全てのモデルで成功しました。これにより:

- **ステップ再現問題が解決**: モデルが前のステップの内容をそのまま繰り返すことがなくなった
- **言語間の一貫性**: 日本語・英語の両方で同様の成功率
- **モデルサイズへの依存性低下**: 4B〜27Bの範囲で全て成功

### 2. 動詞選択の重要性

**失敗した動詞** (v18):
- "Analyze" - 抽象的で、分析結果として前ステップを再現してしまう
- "Explain" - 説明のために前ステップ内容を繰り返してしまう

**成功した動詞** (v19):
- "Read and understand" - 具体的で、理解後に新しい内容を生成するよう促す
- "Use that understanding" - 理解を**活用**することを明示
- "Produce NEW content" - 新規性を強調

### 3. 明示的な禁止事項の効果

```typescript
'- Do NOT copy or reproduce the previous outputs'
```

この明示的な禁止により、モデルが前ステップの内容を繰り返さなくなった。

### 4. モデル別の特徴

- **llm-jp-3.1-8x13b**: 英語で5ステップ計画を立てる傾向（より詳細な計画）
- **gemma-27b/12b**: 一貫して4ステップ計画（安定した挙動）
- **gemma-4b**: 日本語で3ステップと簡潔（小型モデルの効率化）

## 結論

v19の改善により、agentic workflowのステップ再現問題が完全に解決されました。

**重要な学び**:
1. プロンプトの動詞選択が、モデルの挙動に決定的な影響を与える
2. 抽象的な動詞より具体的な動詞の方が、意図した挙動を引き出しやすい
3. 明示的な禁止事項（Don'ts）は、望ましくない挙動の防止に効果的
4. 4B以上のモデルであれば、適切なプロンプトで agentic workflow が機能する

## 次のステップ

1. ✅ v19の改善をメインブランチにマージ
2. 他のタスク（Meal Planning以外）でのテスト
3. より小型モデル（1B以下）での限界の検証
4. プロンプト改善のベストプラクティスのドキュメント化

## ファイル一覧

```
experiments/agentic-workflow-model-comparison/results/
├── gemma-12b-en-freeform-v19.txt (44K)
├── gemma-12b-ja-freeform-v19.txt (47K)
├── gemma-27b-en-freeform-v19.txt (52K)
├── gemma-27b-ja-freeform-v19.txt (50K)
├── gemma-4b-en-freeform-v19.txt (46K)
├── gemma-4b-ja-freeform-v19.txt (40K)
├── llm-jp-8x13b-en-freeform-v19.txt (77K)
└── llm-jp-8x13b-ja-freeform-v19.txt (58K)
```
