# AIService 完全ガイド

AIServiceは、Moduler Promptにおける動的なAIドライバー選択と管理を行うサービスです。アプリケーションの要求に応じて最適なAIモデルを自動選択し、統一されたインターフェースでアクセスできます。

## 目次

1. [概要](#概要)
2. [基本概念](#基本概念)
3. [クイックスタート](#クイックスタート)
4. [ModelSpec（モデル仕様）](#modelspecモデル仕様)
5. [DriverCapability（ドライバー能力）](#drivercapabilityドライバー能力)
6. [AIServiceの使用方法](#aiserviceの使用方法)
7. [選択アルゴリズム](#選択アルゴリズム)
8. [実装パターン](#実装パターン)
9. [ベストプラクティス](#ベストプラクティス)
10. [トラブルシューティング](#トラブルシューティング)

## 概要

### AIServiceとは

AIServiceは、以下の機能を提供する高レベルのサービスクラスです：

- **動的ドライバー選択**: 必要な能力（capability）に基づいて最適なドライバーを選択
- **統一インターフェース**: 異なるAIプロバイダーを統一的に扱う
- **フォールバック機能**: 条件を満たすモデルがない場合の緩和処理
- **優先度制御**: ローカル実行、高速応答、特定プロバイダーの優先

### なぜAIServiceが必要か

| 課題 | AIServiceの解決策 |
|------|------------------|
| モデルの固定的な選択 | 要件に応じた動的選択 |
| プロバイダー依存のコード | プロバイダー中立な実装 |
| フォールバック処理の複雑さ | 自動的な条件緩和 |
| コスト・速度の最適化 | 優先度による自動選択 |

## 基本概念

### 3つの核心要素

#### 1. ModelSpec（モデル仕様）
各AIモデルの詳細な仕様を定義。モデル名、プロバイダー、能力、制限、コストなどを含む。

#### 2. DriverCapability（ドライバー能力）
モデルが持つ機能や特性を表すフラグ。streaming、local、japanese、reasoningなど。

#### 3. SelectionOptions（選択オプション）
モデル選択時の優先条件。ローカル優先、高速優先、プロバイダー指定など。

## クイックスタート

### インストール

```bash
npm install @moduler-prompt/driver
```

### 最小限の例

```typescript
import { AIService } from '@moduler-prompt/driver';

// 設定
const config = {
  models: [
    {
      model: 'gpt-4o-mini',
      provider: 'openai',
      capabilities: ['streaming', 'japanese', 'fast'],
      priority: 10
    },
    {
      model: 'llama-3.3-70b',
      provider: 'mlx',
      capabilities: ['local', 'fast', 'reasoning'],
      priority: 30
    }
  ],
  drivers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    mlx: {}
  }
};

// AIService初期化
const aiService = new AIService(config);

// 日本語対応の高速モデルを選択
const driver = await aiService.createDriverFromCapabilities(
  ['japanese', 'fast']
);

if (driver) {
  const result = await driver.query(compiledPrompt);
  console.log(result.content);
}
```

## ModelSpec（モデル仕様）

### 型定義

```typescript
interface ModelSpec {
  model: string;                      // モデル識別子
  provider: DriverProvider;           // プロバイダー名
  capabilities: DriverCapability[];   // 能力フラグ
  maxInputTokens?: number;           // 最大入力トークン
  maxOutputTokens?: number;          // 最大出力トークン
  maxTotalTokens?: number;           // 合計最大トークン
  tokensPerMinute?: number;          // TPM制限
  requestsPerMinute?: number;        // RPM制限
  cost?: {                           // コスト情報
    input: number;                   // 入力コスト/1K
    output: number;                  // 出力コスト/1K
  };
  priority?: number;                 // 優先度
  enabled?: boolean;                 // 有効/無効
  metadata?: Record<string, unknown>; // カスタムデータ
}
```

### 主要フィールドの説明

| フィールド | 用途 | 例 |
|-----------|------|-----|
| model | モデルの識別子 | 'gpt-4o', 'claude-3-5-sonnet' |
| provider | プロバイダー識別子 | 'openai', 'anthropic', 'mlx' |
| capabilities | モデルの能力リスト | ['streaming', 'japanese'] |
| priority | 選択時の優先度（高いほど優先） | 10, 20, 30 |
| cost | トークンあたりのコスト | { input: 0.01, output: 0.03 } |

## DriverCapability（ドライバー能力）

### 利用可能な能力フラグ

| カテゴリ | 能力 | 説明 |
|---------|------|------|
| **実行環境** | `local` | ローカル実行可能 |
| | `streaming` | ストリーミング応答対応 |
| **性能** | `fast` | 高速応答 |
| | `large-context` | 大規模コンテキスト対応 |
| **言語** | `multilingual` | 多言語対応 |
| | `japanese` | 日本語特化 |
| **特化機能** | `coding` | コーディング特化 |
| | `reasoning` | 推論・思考特化 |
| | `chat` | チャット特化 |
| **拡張機能** | `tools` | ツール使用可能 |
| | `vision` | 画像認識可能 |
| | `audio` | 音声処理可能 |
| **出力形式** | `structured` | 構造化出力対応 |
| | `json` | JSON出力対応 |
| | `function-calling` | 関数呼び出し対応 |

### 能力の組み合わせ例

```typescript
// ローカルで動く日本語対応モデル
['local', 'japanese']

// ストリーミング対応の高速コーディングモデル
['streaming', 'fast', 'coding']

// 構造化出力が可能な推論モデル
['reasoning', 'structured', 'json']
```

## AIServiceの使用方法

### 初期化

```typescript
const config = {
  models: [...],     // ModelSpec配列
  drivers: {         // ドライバー設定
    openai: { apiKey: '...' },
    anthropic: { apiKey: '...' },
    mlx: {}
  }
};

const aiService = new AIService(config);
```

### 能力ベースのドライバー作成

```typescript
// 必要な能力を指定
const driver = await aiService.createDriverFromCapabilities(
  ['japanese', 'streaming'],
  {
    preferLocal: true,        // ローカル優先
    preferFast: false,        // 速度は優先しない
    lenient: true            // 条件緩和を許可
  }
);
```

### 直接モデル指定

```typescript
// ModelSpecを直接指定してドライバー作成
const driver = await aiService.createDriver({
  model: 'gpt-4o-mini',
  provider: 'openai',
  capabilities: ['streaming', 'japanese']
});
```

### モデル選択のみ

```typescript
// ドライバーを作成せず、適合するモデルのリストを取得
const models = aiService.selectModels(
  ['reasoning', 'structured'],
  { preferProvider: 'anthropic' }
);

console.log('適合モデル:', models.map(m => m.model));
```

## 選択アルゴリズム

### 選択プロセス

1. **フィルタリング**: 必要な能力をすべて持つモデルを抽出
2. **除外処理**: excludeProvidersで指定されたプロバイダーを除外
3. **条件緩和**: lenientモードで条件を段階的に緩和
4. **ソート**: 優先条件に基づいて並び替え
5. **選択**: 最上位のモデルを選択

### SelectionOptions

```typescript
interface SelectionOptions {
  preferLocal?: boolean;           // ローカル実行優先
  preferProvider?: DriverProvider; // 特定プロバイダー優先
  excludeProviders?: DriverProvider[]; // 除外プロバイダー
  preferFast?: boolean;            // 高速応答優先
  lenient?: boolean;               // 条件緩和モード
}
```

### 条件緩和（lenient）モード

条件を満たすモデルがない場合、自動的に条件を減らして再検索：

```typescript
// 最初: ['japanese', 'streaming', 'local']
// ↓ 該当なし
// 次: ['japanese', 'streaming']
// ↓ 該当なし
// 次: ['japanese']
// ↓ 見つかった！
```

## 実装パターン

### パターン1: タスク別の動的選択

```typescript
class TaskProcessor {
  private aiService: AIService;

  async processTask(task: Task) {
    // タスクの種類に応じて必要な能力を決定
    const capabilities = this.getRequiredCapabilities(task);

    // 動的にドライバーを選択
    const driver = await this.aiService.createDriverFromCapabilities(
      capabilities,
      { lenient: true }
    );

    if (!driver) {
      throw new Error('適合するモデルが見つかりません');
    }

    return driver.query(task.prompt);
  }

  private getRequiredCapabilities(task: Task): DriverCapability[] {
    switch (task.type) {
      case 'translation':
        return ['multilingual', 'japanese'];
      case 'coding':
        return ['coding', 'reasoning'];
      case 'analysis':
        return ['reasoning', 'structured'];
      default:
        return ['chat'];
    }
  }
}
```

### パターン2: フォールバック戦略

```typescript
async function executeWithFallback(prompt: CompiledPrompt) {
  const strategies = [
    { capabilities: ['local', 'fast'], options: {} },
    { capabilities: ['fast'], options: { excludeProviders: ['mlx'] } },
    { capabilities: [], options: {} }  // 最終手段
  ];

  for (const strategy of strategies) {
    const driver = await aiService.createDriverFromCapabilities(
      strategy.capabilities,
      strategy.options
    );

    if (driver) {
      try {
        return await driver.query(prompt);
      } catch (error) {
        console.warn('実行失敗、次の戦略を試行:', error);
      }
    }
  }

  throw new Error('すべての戦略が失敗');
}
```

### パターン3: コスト最適化

```typescript
function selectCostOptimalModel(
  requiredCapabilities: DriverCapability[],
  maxCost: number
): ModelSpec[] {
  const models = aiService.selectModels(requiredCapabilities);

  return models.filter(model => {
    if (!model.cost) return true;
    return model.cost.output <= maxCost;
  }).sort((a, b) => {
    const costA = a.cost?.output || 0;
    const costB = b.cost?.output || 0;
    return costA - costB;
  });
}
```

## ベストプラクティス

### 1. 設定の外部化

```typescript
// config.json
{
  "models": [
    {
      "model": "gpt-4o-mini",
      "provider": "openai",
      "capabilities": ["streaming", "japanese"],
      "priority": 10,
      "enabled": true
    }
  ]
}

// 使用
import config from './config.json';
const aiService = new AIService(config);
```

### 2. エラーハンドリング

```typescript
const driver = await aiService.createDriverFromCapabilities(
  capabilities,
  { lenient: true }
);

if (!driver) {
  // フォールバック処理
  logger.warn('No suitable model found, using default');
  return useDefaultDriver();
}

try {
  return await driver.query(prompt);
} catch (error) {
  // エラー処理
  logger.error('Query failed:', error);
  throw error;
} finally {
  // クリーンアップ
  await driver.close();
}
```

### 3. 能力の適切な指定

```typescript
// ❌ 過度に具体的
['japanese', 'streaming', 'fast', 'local', 'reasoning']

// ✅ 必要最小限
['japanese', 'reasoning']

// ✅ lenientモードと組み合わせ
await aiService.createDriverFromCapabilities(
  ['japanese', 'reasoning', 'fast'],  // 理想
  { lenient: true }  // 妥協を許可
);
```

### 4. モデル情報のキャッシュ

```typescript
class CachedAIService {
  private modelCache = new Map<string, ModelSpec[]>();

  selectModelsWithCache(
    capabilities: DriverCapability[],
    options?: SelectionOptions
  ): ModelSpec[] {
    const key = JSON.stringify({ capabilities, options });

    if (!this.modelCache.has(key)) {
      const models = this.aiService.selectModels(capabilities, options);
      this.modelCache.set(key, models);
    }

    return this.modelCache.get(key)!;
  }
}
```

## トラブルシューティング

### よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| モデルが見つからない | 能力の過剰指定 | lenientモードを使用 |
| 予期しないモデル選択 | 優先度設定の誤り | priority値を調整 |
| APIキーエラー | 設定の不備 | drivers設定を確認 |
| パフォーマンス問題 | 不適切なモデル | preferFastオプション使用 |

### デバッグ方法

```typescript
// 選択されたモデルの確認
const models = aiService.selectModels(capabilities, options);
console.log('候補モデル:', models.map(m => ({
  model: m.model,
  provider: m.provider,
  priority: m.priority
})));

// 選択理由の追跡
if (models.length === 0) {
  console.log('条件を満たすモデルなし');
  // 条件を1つずつ外して確認
  for (let i = capabilities.length - 1; i >= 0; i--) {
    const partial = capabilities.slice(0, i);
    const found = aiService.selectModels(partial);
    if (found.length > 0) {
      console.log(`条件 ${capabilities[i]} を外すと ${found.length} 個のモデルが見つかる`);
      break;
    }
  }
}
```

## ApplicationConfig型

### 完全な設定例

```typescript
interface ApplicationConfig {
  models?: ModelSpec[];
  drivers: {
    openai?: { apiKey: string; baseURL?: string };
    anthropic?: { apiKey: string };
    vertexai?: { projectId: string; location: string };
    mlx?: { pythonPath?: string };
    ollama?: { baseURL: string };
    test?: { responses?: string[] };
    echo?: { format?: string };
  };
}

const fullConfig: ApplicationConfig = {
  models: [
    {
      model: 'gpt-4o',
      provider: 'openai',
      capabilities: ['streaming', 'reasoning', 'tools', 'vision'],
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      cost: { input: 0.0025, output: 0.01 },
      priority: 20,
      enabled: true
    },
    {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      capabilities: ['streaming', 'reasoning', 'coding'],
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      cost: { input: 0.003, output: 0.015 },
      priority: 25,
      enabled: true
    },
    {
      model: 'llama-3.3-70b',
      provider: 'mlx',
      capabilities: ['local', 'fast', 'reasoning'],
      maxInputTokens: 8192,
      maxOutputTokens: 4096,
      priority: 30,
      enabled: true
    }
  ],
  drivers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: 'https://api.openai.com/v1'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!
    },
    mlx: {
      pythonPath: '/usr/bin/python3'
    }
  }
};
```

## まとめ

AIServiceは、Moduler Promptにおける高度なドライバー管理機能を提供します：

1. **動的選択**: 要件に応じた最適なモデルの自動選択
2. **統一インターフェース**: プロバイダーに依存しない実装
3. **柔軟な優先制御**: ローカル、速度、コストなどの考慮
4. **自動フォールバック**: 条件緩和による確実な実行

これらの機能により、アプリケーションは状況に応じて最適なAIモデルを活用でき、コストとパフォーマンスのバランスを自動的に最適化できます。

## 関連ドキュメント

- [Moduler Prompt 完全ガイド](./COMPLETE_GUIDE.md) - フレームワーク全体の仕様
- [Driver API](./DRIVER_API.md) - ドライバーインターフェースの詳細
- [Structured Outputs](./STRUCTURED_OUTPUTS.md) - 構造化出力の仕様