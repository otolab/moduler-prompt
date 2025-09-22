# テスト戦略と指針

## 概要

Moduler Promptプロジェクトにおけるテストの分類、実装指針、品質基準を定義します。
ドキュメント・コード・テストの三位一体同期管理を基本とし、各レベルのテストが適切に実装され、維持されることを保証します。

## テストの分類

### 1. ユニットテスト (Unit Tests)

**定義**: 単一のモジュール、クラス、関数の振る舞いを検証

**対象例**:
- パラメータバリデーション関数
- 型変換ユーティリティ
- プロンプトフォーマッター
- キュー管理ロジック

**配置**:
```
packages/*/src/**/*.test.ts
packages/*/src/**/*.spec.ts
```

**実行コマンド**:
```bash
npm test                    # 全パッケージのユニットテスト
npm test -w @moduler-prompt/driver  # 特定パッケージのみ
```

### 2. インターフェーステスト (Interface Tests)

**定義**: モジュールの公開APIとインターフェース仕様を検証

**対象例**:
- ドライバーの公開メソッド（query, streamQuery, close）
- プロセスモジュールのAPI
- パッケージのexports

**配置**:
```
packages/*/test/interface/**/*.test.ts
```

### 3. 統合テスト (Integration Tests)

**定義**: 複数モジュール間の相互作用を検証

**対象例**:
- ドライバーとプロセス間の通信
- パラメータマッピングとバリデーションの連携
- プロンプトモジュールの組み合わせ

**配置**:
```
packages/*/test/integration/**/*.test.ts
```

### 4. システムテスト (System Tests)

**定義**: 実際の外部システムと接続して動作を検証

**対象例**:
- MLXモデルの実際のロードと推論
- OpenAI/Anthropic APIとの実通信
- 子プロセスの起動と制御

**配置**:
```
packages/*/test/system/**/*.test.ts
```

**実行コマンド**:
```bash
npm run test:system         # システムテスト実行
npm run test:system:mlx     # MLX関連のシステムテスト
```

### 5. E2Eテスト (End-to-End Tests)

**定義**: ユーザー視点でシステム全体の動作を検証

**対象例**:
- simple-chatアプリケーションの完全なフロー
- 複数ドライバーの切り替え
- エラーハンドリングとリカバリー

**配置**:
```
test/e2e/**/*.test.ts
```

## テスト実装の指針

### パラメータ検証のテスト戦略

#### ユニットレベル
```typescript
// parameter-validator.test.ts
describe('Parameter Validator', () => {
  it('should validate parameter types', () => {
    // 型チェックロジックのみ
  });

  it('should clamp values to valid ranges', () => {
    // 範囲チェックロジックのみ
  });
});
```

#### 統合レベル
```typescript
// parameter-mapping.integration.test.ts
describe('Parameter Mapping Integration', () => {
  it('should map and validate parameters end-to-end', () => {
    // バリデーション → マッピング → 送信形式の確認
  });
});
```

#### システムレベル
```typescript
// mlx-parameters.system.test.ts
describe('MLX Parameters System Test', () => {
  it('should accept temperature parameter in actual MLX process', async () => {
    // 実際のMLXプロセスを起動
    // temperatureがsamplerとして解釈されることを確認
  });
});
```

## ドキュメント・コード・テストの同期

### 三位一体の原則

```
ドキュメント ←→ コード ←→ テスト
     ↑                      ↓
     └────────────────────────┘
```

### 同期確認チェックリスト

**新機能追加時**:
- [ ] 機能仕様をドキュメントに記載
- [ ] インターフェーステストで仕様を定義
- [ ] 実装コードを作成
- [ ] ユニットテストで内部動作を保証
- [ ] READMEの使用例を更新

**バグ修正時**:
- [ ] バグを再現するテストを作成
- [ ] コードを修正
- [ ] 関連ドキュメントを更新
- [ ] CHANGELOGに記載

**パラメータ追加時**:
- [ ] パラメータ仕様をドキュメントに追加
- [ ] バリデーションテストを追加
- [ ] マッピングテストを追加
- [ ] システムテストで実動作を確認

## テストのセットアップパターン

### システムテスト用グローバルセットアップ

```typescript
// test/setup/mlx-test-setup.ts
export class MlxTestEnvironment {
  private static instance: MlxTestEnvironment;
  private testModel = 'mlx-community/gemma-3-270m-it-qat-4bit';

  static async setup() {
    if (!this.instance) {
      this.instance = new MlxTestEnvironment();
      await this.instance.initialize();
    }
    return this.instance;
  }

  async cleanup() {
    // プロセスのクリーンアップ
  }
}
```

### テストヘルパー

```typescript
// test/helpers/mlx-test-utils.ts
export async function testParameterAcceptance(
  paramName: string,
  paramValue: any
) {
  // パラメータが受け入れられることを確認
}

export async function waitForModelLoad(
  timeout = 30000
) {
  // モデルロードの完了を待機
}
```

## モックの使用方針

### MLXドライバーテストでのモック戦略

| テストレベル | MLXプロセス | モデルロード | 推論実行 |
|------------|-----------|-----------|---------|
| ユニット | モック | モック | モック |
| 統合 | モック | モック | モック |
| システム | 実プロセス | 実モデル | 実推論 |

### モック使用の判断基準

**モックすべき場合**:
- 実行時間が5秒を超える処理
- ネットワーク依存の処理
- 外部APIコール
- ファイルシステムの大規模操作

**実システムを使うべき場合**:
- パラメータの実際の処理確認
- プロセス間通信の検証
- エラーハンドリングの確認

## 品質基準

### カバレッジ目標

| テストレベル | カバレッジ目標 | 測定対象 |
|------------|------------|---------|
| ユニット | 80%以上 | 関数・分岐 |
| 統合 | 70%以上 | 主要フロー |
| システム | 主要シナリオ100% | クリティカルパス |

### テスト実行時間の目標

| テストレベル | 単体実行時間 | 全体実行時間 |
|------------|------------|------------|
| ユニット | <100ms | <10s |
| 統合 | <1s | <30s |
| システム | <30s | <5min |

## CI/CD統合

### 実行戦略

```yaml
# PR時
- ユニットテスト: 必須
- 統合テスト: 必須
- システムテスト: 選択的（ラベルによる）

# main ブランチマージ時
- 全テストスイート実行
- カバレッジレポート生成

# リリース時
- E2Eテスト必須
- パフォーマンステスト実行
```

## テストコマンド一覧

```bash
# 開発時
npm test                    # ユニットテスト（watch mode）
npm test -- --run          # ユニットテスト（単発実行）

# 特定テストの実行
npm test -- parameter       # パラメータ関連のテスト
npm test -- mlx            # MLX関連のテスト

# レベル別実行
npm run test:unit          # ユニットテストのみ
npm run test:integration   # 統合テストのみ
npm run test:system        # システムテストのみ

# 包括的実行
npm run test:ci           # CI用（ユニット+統合）
npm run test:all          # 全テスト実行
```

## 今後の改善項目

- [ ] システムテストの並列実行対応
- [ ] テストデータの共有管理
- [ ] パフォーマンステストの追加
- [ ] ビジュアルリグレッションテスト（simple-chat UI）

---

**作成日**: 2025年1月
**最終更新**: 2025年1月