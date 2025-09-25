# Utilities

## 概要

`@moduler-prompt/utils`パッケージは、Moduler Promptシステムで使用される共通ユーティリティを提供します。主要な機能として、ドライバレジストリとログシステムが含まれています。

## ログシステム (Logger System)

### 概要

`@moduler-prompt/utils`のログシステムは、構造化ログ出力とログレベル制御機能を提供します。開発・本番環境での適切なログ出力を支援します。

### なぜログシステムが必要か

1. **環境別の出力制御**: 本番環境では最小限のログ、開発環境では詳細なデバッグ情報を出力
2. **構造化データの記録**: 文字列だけでなく、オブジェクトとして情報を記録し、後から解析しやすくする
3. **パフォーマンスへの配慮**: ログレベルによって出力を制御し、不要な処理を避ける
4. **モジュール識別**: プレフィックスにより、どのモジュールからのログかを明確にする

### 基本コンポーネント

1. **Logger**: メインのログ出力クラス
2. **ログレベル**: QUIET, WARN, INFO, LOG, DEBUG の階層制御
3. **プレフィックス**: ログメッセージに自動的に付与される識別子

### ログレベル階層

```typescript
import { LogLevel } from '@moduler-prompt/utils';

enum LogLevel {
  QUIET = 0,  // ERRORのみ - 重大なエラーのみ記録
  WARN = 1,   // ERROR + WARN - エラーと警告を記録
  INFO = 2,   // ERROR + WARN + INFO（デフォルト）- 通常の動作情報も記録
  LOG = 3,    // ERROR + WARN + INFO + LOG - 詳細動作ログ（--verboseオプション相当）
  DEBUG = 4   // 全レベル - デバッグ情報を含むすべてを記録
}
```

**ログレベルの選び方**:
- **本番環境**: `QUIET`または`WARN` - ユーザーに影響する問題のみ記録
- **ステージング環境**: `INFO` - 正常な動作も含めて記録
- **詳細ログが必要な場合**: `LOG` - CLIツールの--verboseオプションに相当
- **開発環境**: `DEBUG` - すべての情報を記録してデバッグに活用

## API

### 基本的な使用方法

#### Loggerの初期化

```typescript
import { Logger, LogLevel } from '@moduler-prompt/utils';

// デフォルト設定でLoggerを作成
const logger = new Logger();

// カスタム設定でLoggerを作成
const customLogger = new Logger({
  level: LogLevel.DEBUG,
  debug: true,
  prefix: 'MyModule'
});
```

#### logger.error()
**用途**: システムエラーや例外など、即座に対応が必要な問題を記録
**出力条件**: すべてのログレベルで出力される（QUIETレベルでも出力）

```typescript
logger.error('Critical error occurred:', error);
logger.error('Database connection failed', { host: 'localhost', port: 5432 });
```

#### logger.warn()
**用途**: 非推奨機能の使用、設定の不備など、将来的に問題となる可能性がある事象を記録
**出力条件**: WARNレベル以上で出力

```typescript
logger.warn('Deprecated API usage detected');
logger.warn('Configuration missing:', { key: 'API_KEY' });
```

#### logger.info()
**用途**: 正常な処理の開始・終了、重要な状態変化など、システムの動作を追跡するための情報
**出力条件**: INFOレベル以上で出力（デフォルト設定で出力される）

```typescript
logger.info('Processing file:', fileName);
logger.info('Analysis completed successfully');
```

#### logger.log()
**用途**: より詳細な処理内容、中間状態など、通常運用では不要だが調査時に有用な情報（CLIの--verboseオプション相当）
**出力条件**: LOGレベル以上で出力
**使用場面**: ユーザーが詳細な動作ログを求めている場合、トラブルシューティング時

```typescript
logger.log('Detailed processing information');
logger.log('Cache hit for key:', cacheKey);
logger.log('Module initialization complete with options:', options);
```

#### logger.debug()
**用途**: 変数の内容、関数の引数、内部状態など、開発・デバッグ時のみ必要な詳細情報
**出力条件**: DEBUGレベルかつdebugフラグが有効な場合のみ出力
**注意**: debugメソッド内部で既に出力条件をチェックしているため、通常は条件分岐なしで呼び出して問題ない

```typescript
logger.debug('Function called with params:', { param1, param2 });
logger.debug('Internal state:', state);
```

### ログ設定

#### setLevel()
実行時のログレベル変更

```typescript
// デバッグモードに変更
logger.setLevel(LogLevel.DEBUG);

// 静寂モードに変更
logger.setLevel(LogLevel.QUIET);
```

#### setDebug()
デバッグモードの切り替え

```typescript
// デバッグモードを有効化
logger.setDebug(true);

// デバッグモードを無効化
logger.setDebug(false);
```

## DriverRegistryでの使用例

DriverRegistryクラスは内部でLoggerを使用して、モデルの選択とドライバー作成プロセスを追跡します：

```typescript
import { DriverRegistry } from '@moduler-prompt/driver';
import { LogLevel } from '@moduler-prompt/utils';

// ログレベルを指定してRegistryを作成
const registry = new DriverRegistry(LogLevel.DEBUG);

// モデルを登録
registry.registerModel({
  model: 'llama-3.3-70b',
  provider: 'mlx',
  capabilities: ['local', 'fast', 'japanese']
});

// モデル選択時のログ出力例
// [DriverRegistry] Selected model: llama-3.3-70b (mlx)
// [DriverRegistry] Reason: Local execution preferred
```

## 使用パターン

### 1. モジュール固有のロガー

```typescript
class MyModule {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({
      prefix: 'MyModule',
      level: LogLevel.INFO
    });
  }

  async process(data: any) {
    this.logger.info('Processing started');

    try {
      const result = await this.doWork(data);
      this.logger.info('Processing completed', { itemsProcessed: result.count });
      return result;

    } catch (error) {
      this.logger.error('Processing failed:', error);
      throw error;
    }
  }
}
```

### 2. デバッグ出力の使い方

```typescript
function analyzeData(data: any, logger: Logger) {
  // 通常のデバッグ出力 - debugメソッド内部で条件チェック済み
  logger.debug('Input data structure:', {
    type: typeof data,
    keys: Object.keys(data)
  });

  const result = performAnalysis(data);

  logger.debug('Analysis result:', {
    itemsAnalyzed: result.items.length,
    processingTime: result.duration
  });

  return result;
}
```

**ポイント**:
- 通常はdebugメソッドを直接呼び出す（内部でチェック済み）
- デバッグレベルでない場合、debugメソッドは何も実行しないため、パフォーマンスへの影響は最小限

### 3. エラーハンドリングとログ

```typescript
async function robustOperation(input: any) {
  const logger = new Logger({ prefix: 'RobustOp' });

  logger.info('Operation started');

  try {
    const result = await riskyOperation(input);
    logger.info('Operation succeeded');
    return result;

  } catch (error) {
    logger.error('Operation failed:', {
      error: error.message,
      input: typeof input,
      stack: error.stack
    });

    throw error;
  }
}
```

## 設定とベストプラクティス

### 1. 環境別ログレベル設定

```typescript
// 本番環境
const productionLogger = new Logger({
  level: LogLevel.WARN,  // 警告以上のみ
  debug: false
});

// 開発環境
const developmentLogger = new Logger({
  level: LogLevel.DEBUG, // 全ログレベル
  debug: true
});

// テスト環境
const testLogger = new Logger({
  level: LogLevel.QUIET,  // エラーのみ
  debug: false
});
```

### 2. 構造化ログの活用

```typescript
// ❌ 避けるべき：文字列での情報埋め込み
logger.info(`User ${userId} performed action ${action} at ${timestamp}`);

// ✅ 推奨：構造化されたデータ
logger.info('User action performed', {
  userId,
  action,
  timestamp,
  metadata: {
    sessionId,
    userAgent
  }
});
```

### 3. パフォーマンス考慮

```typescript
// ⭕ 通常のケース - debugメソッドを直接呼び出す
logger.debug('User action:', { userId, action, timestamp });
logger.debug('Cache status:', { hits: cacheHits, misses: cacheMisses });

// ⚠️ 非常に重い処理を含む場合の例（まれなケース）
// 例: 巨大オブジェクトのシリアライズ（数MB以上）
function debugLargeObject(obj: LargeObject, logger: Logger) {
  // この場合、JSON.stringifyが重いので事前チェックを検討できる
  // ただし、通常はこのような巨大オブジェクトをログに出すこと自体を避けるべき
  logger.debug('Object summary:', {
    type: obj.type,
    count: obj.items.length,
    sample: obj.items.slice(0, 3) // サンプルのみ出力
  });
}
```

**推奨事項**:
- 基本的にdebugメソッドを直接呼び出す
- 巨大データは要約やサンプルのみログに出力
- 本当に重い処理（数十ミリ秒以上）は、そもそもログ出力を再検討

### 4. 大量データのログ

```typescript
// ❌ 大量データの直接ログ
logger.debug('All data:', massiveArray);

// ✅ サマリー情報のみログ
logger.debug('Data summary:', {
  count: massiveArray.length,
  sample: massiveArray.slice(0, 3),
  types: [...new Set(massiveArray.map(item => typeof item))]
});
```

## 実装ファイル

- **Logger実装**: `packages/utils/src/logger/index.ts`
- **DriverRegistry**: `packages/driver/src/driver-registry/registry.ts`
- **AIService**: `packages/driver/src/driver-registry/ai-service.ts`
- **型定義**: `packages/utils/src/logger/index.ts`

## 関連ドキュメント

- [Architecture](./ARCHITECTURE.md) - システム全体のアーキテクチャ
- [Driver API](./DRIVER_API.md) - ドライバAPIの詳細