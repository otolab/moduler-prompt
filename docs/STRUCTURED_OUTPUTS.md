# Structured Outputs仕様

`@moduler-prompt`におけるStructured Outputs（構造化出力）の仕様と実装ガイド。

## 概要

Structured Outputsは、AIモデルからの応答を構造化されたデータ（JSON）として取得する機能です。v0.2.0より正式サポートを開始し、各ドライバーが独自の方法で実装しています。

## アーキテクチャ

### データフロー

```
PromptModule
    ↓ (outputSchema定義)
CompiledPrompt (metadata.outputSchema)
    ↓
AIDriver
    ↓ (スキーマに基づく生成)
QueryResult.structuredOutputs
```

### 型定義

#### CompiledPrompt (core/types.ts)

```typescript
interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
  metadata?: {
    outputSchema?: object;  // JSON Schemaオブジェクト
  };
}
```

#### QueryResult (driver/types.ts)

```typescript
interface QueryResult {
  content: string;  // 生のテキストレスポンス

  /**
   * 構造化出力の配列
   * - undefined: スキーマ未指定
   * - []: スキーマ指定済みだが有効なJSONなし
   * - [...]: 抽出されたJSONオブジェクト/配列
   */
  structuredOutputs?: unknown[];

  usage?: {...};
  finishReason?: 'stop' | 'length' | 'error';
}
```

## 実装パターン

### 1. ネイティブサポート型（OpenAI、Anthropic、VertexAI）

これらのドライバーはAPIレベルでstructured outputsをサポート：

#### OpenAIDriver

```typescript
// response_formatパラメータを使用
const params = {
  response_format: prompt.metadata?.outputSchema
    ? { type: 'json_object' }
    : undefined,
  // ...
};

// レスポンスを解析
if (prompt.metadata?.outputSchema && params.response_format) {
  try {
    const parsed = JSON.parse(fullContent);
    structuredOutputs = [parsed];
  } catch {
    structuredOutputs = [];
  }
}
```

#### AnthropicDriver

```typescript
// システムプロンプトでJSON生成を指示（実装予定）
if (prompt.metadata?.outputSchema) {
  messages[0].content += '\nRespond with valid JSON matching the schema.';
}
```

#### VertexAIDriver

```typescript
// responseFormatとjsonSchemaパラメータを使用
const params = {
  responseFormat: prompt.metadata?.outputSchema ? 'json' : 'text',
  jsonSchema: prompt.metadata?.outputSchema,
  // ...
};
```

### 2. JSON抽出型（TestDriver、EchoDriver）

これらのドライバーはレスポンスからJSONを抽出：

#### TestDriver

```typescript
import { extractJSON } from '@moduler-prompt/utils';

// outputSchemaが指定されている場合のみJSON抽出
if (prompt.metadata?.outputSchema && content) {
  const extracted = extractJSON(content, { multiple: false });
  if (extracted.source !== 'none' && extracted.data !== null) {
    structuredOutputs = [extracted.data];
  }
}
```

#### EchoDriver

```typescript
// フォーマットに応じて抽出方法を変更
if (prompt.metadata?.outputSchema) {
  if (this.format === 'raw' || this.format === 'messages' ||
      this.format === 'both' || this.format === 'debug') {
    // JSON形式の出力から抽出
    const extracted = extractJSON(content, { multiple: false });
    if (extracted.source !== 'none' && extracted.data !== null) {
      structuredOutputs = [extracted.data];
    }
  }
}
```

### 3. 未実装型（MlxDriver、OllamaDriver）

これらのドライバーは今後の実装を予定：

- **MlxDriver**: Pythonプロセスでのスキーマ検証を検討
- **OllamaDriver**: OpenAI互換APIの機能を活用予定

## 使用方法

### 基本的な使用例

```typescript
import { compile } from '@moduler-prompt/core';
import { OpenAIDriver } from '@moduler-prompt/driver';

// スキーマを含むプロンプトをコンパイル
const prompt = compile(myModule, context);
prompt.metadata = {
  outputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      skills: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['name', 'age']
  }
};

// ドライバーで実行
const driver = new OpenAIDriver({ apiKey: '...' });
const result = await driver.query(prompt);

// 構造化出力を取得
if (result.structuredOutputs && result.structuredOutputs.length > 0) {
  const data = result.structuredOutputs[0] as {
    name: string;
    age: number;
    skills?: string[];
  };
  console.log(data.name, data.age);
}
```

### ストリーミングでの使用

```typescript
const { stream, result } = await driver.streamQuery(prompt);

// ストリームを処理
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 最終結果から構造化出力を取得
const finalResult = await result;
if (finalResult.structuredOutputs) {
  console.log('Structured:', finalResult.structuredOutputs);
}
```

## JSON抽出ユーティリティ

`@moduler-prompt/utils`パッケージの`extractJSON`関数は、様々な形式からJSONを抽出：

### 対応形式

1. **直接JSON**: `{"key": "value"}`
2. **マークダウンコードブロック**:
   ````markdown
   ```json
   {"key": "value"}
   ```
   ````
3. **埋め込みJSON**: `Some text {"key": "value"} more text`
4. **複数のJSON**: 複数のJSONオブジェクトを含むテキスト

### 使用例

```typescript
import { extractJSON } from '@moduler-prompt/utils';

const text = 'Result: ```json\n{"status": "success"}\n```';
const extracted = extractJSON(text, { multiple: false });

if (extracted.source !== 'none') {
  console.log(extracted.data);  // { status: "success" }
  console.log(extracted.source); // "markdown"
}
```

## ベストプラクティス

### 1. スキーマ設計

- **明確な型定義**: 曖昧さを避け、期待する構造を明確に定義
- **必須フィールドの明示**: `required`配列で必須項目を指定
- **デフォルト値の考慮**: オプショナルフィールドの扱いを明確に

### 2. エラーハンドリング

```typescript
const result = await driver.query(prompt);

// 構造化出力の検証
if (result.structuredOutputs === undefined) {
  // スキーマが指定されていない
} else if (result.structuredOutputs.length === 0) {
  // 有効なJSONが生成されなかった
  console.warn('Failed to generate valid JSON:', result.content);
} else {
  // 成功
  const data = result.structuredOutputs[0];
  // 型ガードやバリデーションを実施
}
```

### 3. フォールバック戦略

```typescript
// 構造化出力が失敗した場合のフォールバック
const data = result.structuredOutputs?.[0] ||
  parseManually(result.content) ||
  defaultData;
```

## ドライバー別対応状況

| ドライバー | 対応状況 | 実装方式 | 備考 |
|----------|---------|---------|-----|
| OpenAIDriver | ✅ 対応済み | response_format API | v0.2.0〜 |
| AnthropicDriver | ⚠️ 部分対応 | プロンプト指示 | 改善予定 |
| VertexAIDriver | ⚠️ 部分対応 | responseFormat/jsonSchema | 検証中 |
| TestDriver | ✅ 対応済み | JSON抽出 | v0.2.1〜 |
| EchoDriver | ✅ 対応済み | JSON抽出 | v0.2.1〜 |
| MlxDriver | ❌ 未対応 | - | 実装予定 |
| OllamaDriver | ❌ 未対応 | - | 実装予定 |

## 今後の拡張予定

### v0.3.0での改善案

1. **スキーマ検証**: 生成されたJSONのスキーマ検証機能
2. **型生成**: スキーマからTypeScript型を自動生成
3. **複数出力**: 複数のJSONオブジェクトの同時生成
4. **ストリーミング対応**: JSONのストリーミングパース

### 長期的な検討事項

1. **プロンプトモジュールでのスキーマ定義**:
   ```typescript
   const module: PromptModule = {
     outputSchema: {
       type: 'object',
       // ...
     }
   };
   ```

2. **型安全な構造化出力**:
   ```typescript
   interface OutputType {
     name: string;
     age: number;
   }

   const result = await driver.query<OutputType>(prompt);
   // result.structuredOutputs は OutputType[] 型
   ```

3. **スキーマバリデーションライブラリとの統合**: Zod、Yup等との連携

## トラブルシューティング

### よくある問題

1. **JSONが生成されない**
   - プロンプトにJSON生成の明示的な指示を追加
   - スキーマの複雑さを減らす
   - temperature を下げて確定的な出力を促す

2. **不正なJSONが生成される**
   - モデルの制限を確認（トークン数等）
   - スキーマの構造を簡素化
   - extractJSON のエラーログを確認

3. **型の不一致**
   - スキーマと実際の出力を比較
   - 型ガードを実装してランタイムで検証
   - バリデーションライブラリの使用を検討

## 関連ドキュメント

- [Driver API](./DRIVER_API.md) - ドライバーインターフェースの詳細
- [型定義](../packages/core/src/types.ts) - CompiledPromptの型定義
- [JSON抽出ユーティリティ](../packages/utils/src/json-extractor/) - extractJSON関数の実装

---

**作成日**: 2024年1月
**最終更新**: 2024年1月（v0.2.1）