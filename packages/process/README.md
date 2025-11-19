# @moduler-prompt/process

プロンプトモジュールとワークフローを提供するパッケージ。

## インストール

```bash
npm install @moduler-prompt/process
```

## ワークフロー

### チャンク処理ワークフロー

- **`streamProcess`** - ステートを保持しながらチャンクを逐次処理
- **`concatProcess`** - 各チャンクを独立して処理し、結果を結合

### エージェント型ワークフロー

- **`agenticProcess`** - 自律的な複数ステップ処理（計画→実行→統合）
- **`agentProcess`** - シンプルな計画→実行→統合ワークフロー

## モジュール

- **`streamProcessing`** - チャンク単位の逐次処理と状態管理
- **`withMaterials`** - 資料をプロンプトに含める
- **`dialogueモジュール群`** - 対話処理用モジュール
- **`summarizeモジュール群`** - 要約処理用モジュール
- **`agenticモジュール群`** - エージェント型ワークフロー用モジュール

## 使用例

### チャンク処理

```typescript
import { streamProcess } from '@moduler-prompt/process';
import { streamProcessing } from '@moduler-prompt/process';
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver(['response1', 'response2']);

const result = await streamProcess(
  driver,
  streamProcessing,
  {
    chunks: [{ content: 'text1' }, { content: 'text2' }],
    state: { content: '', usage: 0 }
  },
  { tokenLimit: 1000 }
);
```

### エージェント型ワークフロー

```typescript
import { agenticProcess } from '@moduler-prompt/process';
import { AnthropicDriver } from '@moduler-prompt/driver';

const driver = new AnthropicDriver({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// ユーザー定義のプロンプトモジュール
const userModule = {
  objective: ['今日の夕飯の献立を決定する'],
  instructions: [
    '- 冷蔵庫の材料から作れる主菜候補を検討する',
    '- 過去の献立と比較し、似たものが続かないようにする',
    '- 選んだ主菜に合う副菜を提案する',
    '- 不足している材料があれば買い出しリストを作成する'
  ]
};

// コンテキスト（初期データ）
const context = {
  objective: '今日の夕飯の献立を決定する',
  inputs: {
    refrigerator: {
      proteins: ['鶏もも肉 300g', '豚バラ肉 200g', '卵 6個'],
      vegetables: ['キャベツ', '人参', '玉ねぎ', 'じゃがいも']
    },
    pastMeals: [
      { date: '昨日', mainDish: 'カレーライス' },
      { date: '一昨日', mainDish: '生姜焼き' }
    ]
  }
};

// ワークフロー実行（計画→実行→統合）
const result = await agenticProcess(driver, userModule, context, {
  maxSteps: 5  // 最大5ステップまで
});

console.log(result.output);  // 最終的な献立提案
console.log(result.metadata); // { planSteps: 5, executedSteps: 5, actionsUsed: 0 }
```

### 簡易エージェントワークフロー

```typescript
import { agentProcess } from '@moduler-prompt/process';
import { TestDriver } from '@moduler-prompt/driver';

const driver = new TestDriver();

const userModule = {
  objective: ['週末旅行プランを提案する'],
  instructions: [
    '- 交通手段・宿泊先・食事プランを検討する',
    '- 入力データに応じて実行計画を自律的に組み立てる'
  ]
};

const context = {
  objective: '週末旅行プランを提案する',
  inputs: {
    budget: '50,000円',
    city: '箱根'
  }
};

const actions = {
  lookupHotel: async (params: { city: string }) => {
    return { recommended: [`${params.city} 温泉旅館`] };
  }
};

const result = await agentProcess(driver, userModule, context, {
  maxSteps: 4,
  actions
});

console.log(result.output);
console.log(result.metadata); // { planSteps: 3, executedSteps: 3, actionsUsed: 1 }
```

### アクション（外部ツール）の使用

```typescript
import { agenticProcess } from '@moduler-prompt/process';

// 外部ツール/APIの定義
const actions = {
  fetchWeather: async (params: { location: string }) => {
    const response = await fetch(`https://api.weather.com/${params.location}`);
    return response.json();
  },
  searchRecipes: async (params: { ingredients: string[] }) => {
    // レシピ検索APIを呼び出し
    return { recipes: [...] };
  }
};

const result = await agenticProcess(driver, userModule, context, {
  maxSteps: 5,
  actions  // アクションを渡す
});

// AIが計画フェーズで必要なアクションを判断し、実行フェーズで自動的に呼び出す
```

## テスト戦略

このパッケージは3層のテスト戦略を採用しています。

### 1. モジュール単体テスト（Driver不使用）

プロンプトモジュールの純粋なロジックを検証します。

#### 基本的なモジュールテスト

```typescript
// material.test.ts の例
it('材料がある場合はmaterialセクションを生成', () => {
  const context: MaterialContext = {
    materials: [{ id: 'doc1', title: 'Document 1', content: '...' }]
  };
  const result = compile(withMaterials, context);
  expect(result.data).toBeDefined();
});
```

#### プロンプト構造検証テスト

```typescript
// prompt-inspection.test.ts の例
it('should include planning requirements and user inputs', () => {
  const planningContext: AgenticWorkflowContext = {
    objective: '文書を分析し、重要な洞察を抽出する',
    inputs: { document: 'サンプルドキュメントの内容...' }
  };

  const mergedPlanning = merge(planning, userModule);
  const planningPrompt = compile(mergedPlanning, planningContext);

  const instructionText = collectText(planningPrompt.instructions);
  expect(instructionText).toContain('Planning Requirements');
  expect(instructionText).toContain('Respond ONLY with valid JSON text');
});
```

**特徴:**
- 高速・決定的
- `compile()`の結果を検証
- AIモデル不要
- プロンプト構造や期待される文言を詳細に検証可能

### 2. ワークフロー機能テスト（TestDriver使用）

ワークフロー全体の動作を、モックレスポンスで検証します。

```typescript
// agent-workflow.test.ts の例
it('executes planning, execution, and integration phases', async () => {
  const driver = new TestDriver({
    responses: [
      JSON.stringify(plan),  // Planning
      'step 1 result',        // Execution
      'step 2 result',
      'final output'          // Integration
    ]
  });

  const result = await agentProcess(driver, userModule, context);
  expect(result.output).toBe('final output');
});
```

**特徴:**
- 高速・決定的
- ワークフロー全体の動作確認
- 実際のAIモデルは使用しない

### 3. 実モデルでの検証

CI環境では実行せず、手動実験スクリプトで検証します。

```bash
# 実際のMLXモデルでワークフローをテスト
npx tsx scripts/test-agentic-workflow.ts test-cases/meal-planning.json
```

**理由:**
- 実行時間が長い
- モデルの応答が不確定
- API/GPU環境への依存

### テスト実行

```bash
# 全テスト実行
npm test

# 特定ファイルのみ
npm test -- agent-workflow.test.ts

# ウォッチモード
npm test -- --watch
```

## ライセンス

MIT
