# テスト用ドライバーガイド

## 概要

開発・テスト用に2つの専用ドライバーを提供しています。

| ドライバー | 用途 | 特徴 |
|---------|------|------|
| **TestDriver** | ユニットテスト、モック | 事前定義したレスポンスを返す |
| **EchoDriver** | デバッグ、プロンプト検証 | プロンプトをエコーバック |

## TestDriver

### responses配列のキュー動作

TestDriverは`responses`配列をキューとして扱います。`query()`または`streamQuery()`を呼び出すたびに、配列の先頭から順番にレスポンスを取り出します。

```typescript
import { TestDriver } from '@modular-prompt/driver';

const driver = new TestDriver({
  responses: [
    'First response',   // 1回目のquery()で使用
    'Second response',  // 2回目のquery()で使用
    'Third response'    // 3回目のquery()で使用
  ]
});

const result1 = await driver.query(prompt);
console.log(result1.content); // "First response"

const result2 = await driver.query(prompt);
console.log(result2.content); // "Second response"

// キューが空になるとエラー
```

### 動的レスポンス生成

関数を使って動的にレスポンスを生成できます。

```typescript
const driver = new TestDriver({
  responses: (prompt, options) => {
    // プロンプトの内容に応じて動的にレスポンスを生成
    if (prompt.metadata?.outputSchema) {
      return JSON.stringify({ result: 'structured data' });
    }

    if (options?.temperature && options.temperature > 0.7) {
      return 'Creative response';
    }

    return 'Default response';
  }
});
```

### finishReasonのカスタマイズ

エラーハンドリングのテストのために、finishReasonを制御できます。

```typescript
import { TestDriver } from '@modular-prompt/driver';

// MockResponseオブジェクトでfinishReasonを指定
const driver = new TestDriver({
  responses: [
    { content: 'Normal completion', finishReason: 'stop' },
    { content: 'Truncated...', finishReason: 'length' },
    { content: 'Error occurred', finishReason: 'error' }
  ]
});

const result1 = await driver.query(prompt);
console.log(result1.finishReason); // 'stop'

const result2 = await driver.query(prompt);
console.log(result2.finishReason); // 'length'

const result3 = await driver.query(prompt);
console.log(result3.finishReason); // 'error'
```

関数プロバイダーでも使用できます：

```typescript
const driver = new TestDriver({
  responses: (prompt) => {
    // プロンプトが長すぎる場合はlengthで終了
    if (prompt.instructions.length > 10) {
      return { content: 'Too long...', finishReason: 'length' };
    }
    return { content: 'OK', finishReason: 'stop' };
  }
});
```

**互換性**: 文字列レスポンスは自動的に`finishReason: 'stop'`として扱われます。

### Structured Outputs使用時の注意点

**重要**: スキーマで定義したフィールド名とレスポンスのフィールド名が一致している必要があります。

```typescript
// ❌ 失敗例: フィールド名が一致しない
const driver = new TestDriver({
  responses: [JSON.stringify({
    userName: 'Alice',  // スキーマでは 'name'
    userAge: 30         // スキーマでは 'age'
  })]
});
// result.structuredOutput = undefined (フィールド名不一致)

// ✅ 成功例: フィールド名が一致
const driver = new TestDriver({
  responses: [JSON.stringify({
    name: 'Alice',      // スキーマと一致
    age: 30             // スキーマと一致
  })]
});
// result.structuredOutput = { name: 'Alice', age: 30 }
```

マークダウンコードブロック内のJSONも抽出されます：

```typescript
const driver = new TestDriver({
  responses: ['Here is the result:\n```json\n{"status": "success"}\n```']
});

// result.structuredOutput = { status: 'success' }
```

### ストリーミングのテスト

```typescript
const driver = new TestDriver({
  responses: ['Hello World'],
  delay: 100 // 各文字間に遅延を追加
});

const { stream, result } = await driver.streamQuery(prompt);

// 文字ごとにストリーミング
for await (const char of stream) {
  process.stdout.write(char);
}

const finalResult = await result;
console.log(finalResult.structuredOutput);
```

## EchoDriver

### 基本的な使い方

```typescript
import { EchoDriver } from '@modular-prompt/driver';

const driver = new EchoDriver({
  format: 'text'  // デフォルト
});

const result = await driver.query(prompt);
console.log(result.content); // フォーマット済みプロンプトが返される
```

### 出力形式の選択

```typescript
type Format = 'text' | 'messages' | 'raw' | 'both' | 'debug';

// テキスト形式（マークダウンフォーマット）
const textDriver = new EchoDriver({ format: 'text' });

// メッセージ形式（ChatMessage配列のJSON）
const messagesDriver = new EchoDriver({ format: 'messages' });

// 生データ形式（CompiledPromptのJSON）
const rawDriver = new EchoDriver({ format: 'raw' });

// デバッグ形式（詳細なメタデータを含む）
const debugDriver = new EchoDriver({ format: 'debug' });
```

### デバッグ情報の取得

```typescript
const driver = new EchoDriver({
  format: 'debug',
  includeMetadata: true
});

const result = await driver.query(prompt, {
  temperature: 0.7,
  maxTokens: 100
});

const debug = JSON.parse(result.content);
console.log(debug.metadata.instructionsCount); // instructions要素の数
console.log(debug.metadata.queryOptions);      // 渡されたオプション
console.log(debug.formatted.text);             // フォーマット済みテキスト
console.log(debug.formatted.messages);         // メッセージ配列
```

## 使用例

### ユニットテストでの使用

```typescript
import { describe, it, expect } from 'vitest';
import { TestDriver } from '@modular-prompt/driver';

describe('MyModule', () => {
  it('should handle structured outputs', async () => {
    const driver = new TestDriver({
      responses: ['{"result": "success", "data": [1, 2, 3]}']
    });

    const prompt = compile(myModule, { input: 'test' });
    prompt.metadata = {
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          data: { type: 'array' }
        }
      }
    };

    const result = await driver.query(prompt);
    expect(result.structuredOutput).toEqual({
      result: 'success',
      data: [1, 2, 3]
    });
  });
});
```

### プロンプト検証

```typescript
const driver = new EchoDriver({ format: 'text' });

const prompt = compile(myModule, { input: 'test' });
const result = await driver.query(prompt);

// プロンプトが正しくフォーマットされているか確認
expect(result.content).toContain('# Instructions');
expect(result.content).toContain('test');
```

## 関連ドキュメント

- [Driver APIリファレンス](./DRIVER_API.md) - ドライバーAPIの詳細
- [Structured Outputs仕様](./STRUCTURED_OUTPUTS.md) - Structured Outputsの仕様
- [テスト戦略と指針](./TESTING_STRATEGY.md) - テスト戦略
