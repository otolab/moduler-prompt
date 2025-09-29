# テスト用ドライバーガイド

## 概要

Moduler Promptは開発・テスト用に2つの専用ドライバーを提供しています。これらはユニットテストやデバッグで活用でき、structured outputsにも対応しています。

### ドライバーの選び方

| ドライバー | 用途 | 特徴 |
|---------|------|------|
| **TestDriver** | ユニットテスト、モック | 事前定義したレスポンスを返す |
| **EchoDriver** | デバッグ、プロンプト検証 | プロンプトをエコーバック |

## TestDriver

### 基本的な使い方

#### responses配列の動作原理

TestDriverは`responses`配列を**キュー**として扱います。`query()`または`streamQuery()`を呼び出すたびに、配列の先頭から順番にレスポンスを取り出して使用します。

```typescript
import { TestDriver } from '@moduler-prompt/driver';
import { compile } from '@moduler-prompt/core';

// 3つのレスポンスをキューに設定
const driver = new TestDriver({
  responses: [
    'First response',   // 1回目のquery()で使用
    'Second response',  // 2回目のquery()で使用
    'Third response'    // 3回目のquery()で使用
  ]
});

const prompt = compile(myModule, context);

// 1回目の呼び出し
const result1 = await driver.query(prompt);
console.log(result1.content); // "First response"

// 2回目の呼び出し
const result2 = await driver.query(prompt);
console.log(result2.content); // "Second response"

// 3回目の呼び出し
const result3 = await driver.query(prompt);
console.log(result3.content); // "Third response"

// 4回目の呼び出し - キューが空なのでエラー
try {
  const result4 = await driver.query(prompt);
} catch (error) {
  console.error(error.message); // "No more responses available"
}
```

#### キューの消費パターン

```typescript
// ストリーミングもキューから1つ消費
const driver = new TestDriver({
  responses: ['Response 1', 'Response 2']
});

// streamQueryも1つ消費
const { stream, result } = await driver.streamQuery(prompt);
for await (const chunk of stream) {
  // "Response 1"を文字ごとにストリーミング
}

// 次のqueryは2つ目を使用
const result2 = await driver.query(prompt);
console.log(result2.content); // "Response 2"
```

### 動的レスポンス生成

キュー方式の代わりに、関数を使って動的にレスポンスを生成できます。

```typescript
// レスポンスプロバイダー関数を使用
let callCount = 0;
const driver = new TestDriver({
  responses: (prompt, options) => {
    callCount++;

    // プロンプトの内容に応じて動的にレスポンスを生成
    if (prompt.metadata?.outputSchema) {
      // structured outputが要求されている場合
      return JSON.stringify({
        result: 'structured data',
        callNumber: callCount
      });
    }

    if (options?.temperature && options.temperature > 0.7) {
      // 高温度設定の場合
      return 'Creative response';
    }

    // デフォルト
    return `Response ${callCount}`;
  }
});

// 関数は毎回呼び出される
const result1 = await driver.query(prompt);
const result2 = await driver.query(prompt);
// result1.content !== result2.content (毎回異なるレスポンス)
```

### Structured Outputsのテスト

#### 基本的な使用方法

```typescript
const driver = new TestDriver({
  responses: ['{"name": "Alice", "age": 30}']
});

const prompt = compile(myModule, context);
prompt.metadata = {
  outputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
  }
};

const result = await driver.query(prompt);
console.log(result.content);          // '{"name": "Alice", "age": 30}'
console.log(result.structuredOutput); // { name: 'Alice', age: 30 }
```

#### 重要：フィールド名の一致

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

### マークダウンコードブロック内のJSON

```typescript
const driver = new TestDriver({
  responses: ['Here is the result:\n```json\n{"status": "success"}\n```']
});

const prompt = compile(myModule, context);
prompt.metadata = {
  outputSchema: { type: 'object' }
};

const result = await driver.query(prompt);
console.log(result.structuredOutput); // { status: 'success' }
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
  process.stdout.write(char); // H, e, l, l, o, , W, o, r, l, d
}

// 最終結果の取得
const finalResult = await result;
console.log(finalResult.structuredOutput);
```

## EchoDriver

### 基本的な使い方

```typescript
import { EchoDriver } from '@moduler-prompt/driver';
import { compile } from '@moduler-prompt/core';

// テキスト形式でプロンプトをエコーバック
const driver = new EchoDriver({
  format: 'text'
});

const prompt = compile(myModule, context);
const result = await driver.query(prompt);
console.log(result.content); // フォーマット済みプロンプトが返される
```

### 出力形式の選択

```typescript
// 利用可能な形式
type Format = 'text' | 'messages' | 'raw' | 'both' | 'debug';

// テキスト形式（マークダウンフォーマット）
const textDriver = new EchoDriver({ format: 'text' });

// メッセージ形式（ChatMessage配列のJSON）
const messagesDriver = new EchoDriver({ format: 'messages' });

// 生データ形式（CompiledPromptのJSON）
const rawDriver = new EchoDriver({ format: 'raw' });

// 両方（textとmessagesの両方を含むJSON）
const bothDriver = new EchoDriver({ format: 'both' });

// デバッグ形式（詳細なメタデータを含む）
const debugDriver = new EchoDriver({ format: 'debug' });
```

### Structured Outputsの自動生成

```typescript
// JSON形式の出力では自動的にstructuredOutputが生成される
const driver = new EchoDriver({ format: 'raw' });

const prompt = compile(myModule, context);
prompt.metadata = {
  outputSchema: {
    type: 'object',
    properties: {
      instructions: { type: 'array' },
      data: { type: 'array' }
    }
  }
};

const result = await driver.query(prompt);
// rawフォーマットはCompiledPromptをJSONとして返すので、
// そのままstructuredOutputとして利用可能
console.log(result.structuredOutput);
// { instructions: [...], data: [...], output: [...] }
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

### カスタムフォーマッター設定

```typescript
const driver = new EchoDriver({
  format: 'text',
  formatterOptions: {
    preamble: 'CUSTOM PREAMBLE',
    sectionDescriptions: {
      instructions: 'カスタム説明'
    },
    markers: {
      materialStart: '=== ',
      materialEnd: ' ==='
    }
  }
});
```

### ストリーミング設定

```typescript
const driver = new EchoDriver({
  format: 'text',
  streamChunkSize: 50, // 50文字ずつチャンクで送信
  simulateUsage: true  // トークン使用量をシミュレート
});

const { stream, result } = await driver.streamQuery(prompt);

const chunks = [];
for await (const chunk of stream) {
  chunks.push(chunk);
  // 50文字ずつ受信
}
```

## テストでの活用例

### ユニットテストでの使用

```typescript
import { describe, it, expect } from 'vitest';
import { TestDriver } from '@moduler-prompt/driver';
import { myModule } from './my-module';
import { compile } from '@moduler-prompt/core';

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

  it('should generate appropriate prompts', async () => {
    const echoDriver = new EchoDriver({ format: 'text' });

    const prompt = compile(myModule, { input: 'test' });
    const result = await echoDriver.query(prompt);

    // プロンプトが正しくフォーマットされているか確認
    expect(result.content).toContain('# Instructions');
    expect(result.content).toContain('test');
  });
});
```

### 動的レスポンスのテスト

```typescript
describe('Dynamic Response Tests', () => {
  it('should respond based on prompt content', async () => {
    let callCount = 0;

    const driver = new TestDriver({
      responses: (prompt, options) => {
        callCount++;

        // プロンプトの内容に応じて異なるレスポンスを返す
        if (options?.temperature && options.temperature > 0.5) {
          return 'Creative response';
        }

        if (prompt.metadata?.outputSchema) {
          return JSON.stringify({ id: callCount, type: 'structured' });
        }

        return `Response ${callCount}`;
      }
    });

    // 通常のクエリ
    const result1 = await driver.query(compile(myModule, {}));
    expect(result1.content).toBe('Response 1');

    // 高温度設定
    const result2 = await driver.query(compile(myModule, {}), {
      temperature: 0.8
    });
    expect(result2.content).toBe('Creative response');

    // Structured output
    const prompt = compile(myModule, {});
    prompt.metadata = { outputSchema: { type: 'object' } };
    const result3 = await driver.query(prompt);
    expect(result3.structuredOutput).toEqual({
      id: 3,
      type: 'structured'
    });
  });
});
```

### プロンプト検証

```typescript
describe('Prompt Validation', () => {
  it('should generate correct prompt structure', async () => {
    const driver = new EchoDriver({ format: 'debug' });

    const context = {
      items: ['item1', 'item2'],
      options: { verbose: true }
    };

    const prompt = compile(myModule, context);
    const result = await driver.query(prompt);

    const debug = JSON.parse(result.content);

    // プロンプト構造の検証
    expect(debug.metadata.instructionsCount).toBeGreaterThan(0);
    expect(debug.metadata.dataCount).toBeGreaterThan(0);

    // フォーマット済みテキストの検証
    expect(debug.formatted.text).toContain('item1');
    expect(debug.formatted.text).toContain('item2');

    // メッセージ形式の検証
    expect(debug.formatted.messages).toHaveLength(
      debug.metadata.instructionsCount +
      debug.metadata.dataCount +
      debug.metadata.outputCount
    );
  });
});
```

## ベストプラクティス

### 1. テスト環境の分離

```typescript
// test-setup.ts
export function createTestDriver(options = {}) {
  return process.env.USE_ECHO_DRIVER
    ? new EchoDriver({ format: 'debug', ...options })
    : new TestDriver({ responses: ['Test response'], ...options });
}
```

### 2. レスポンスの再利用

```typescript
// test-responses.ts
export const TEST_RESPONSES = {
  user: JSON.stringify({ name: 'Alice', age: 30 }),
  error: JSON.stringify({ error: 'Not found' }),
  list: JSON.stringify({ items: [1, 2, 3] })
};

// テストで使用
const driver = new TestDriver({
  responses: [TEST_RESPONSES.user]
});
```

### 3. デバッグ時の活用

```typescript
// デバッグ時はEchoDriverで実際のプロンプトを確認
if (process.env.DEBUG) {
  const driver = new EchoDriver({
    format: 'debug',
    includeMetadata: true
  });

  const result = await driver.query(prompt);
  console.log('Generated prompt:', result.content);
}
```

## 注意事項

### Structured Outputs使用時のフィールド名一致

TestDriverでstructured outputsを使用する際、**スキーマで定義したフィールド名と実際のレスポンスのフィールド名が一致している必要があります**。

```typescript
// ❌ 間違い - フィールド名が不一致
const driver = new TestDriver({
  responses: [JSON.stringify({
    shouldMergeWith: ['issue-456'],  // スキーマではrelatedIssueIds
    impactedComponents: []           // スキーマではaffectedComponents
  })]
});

const prompt = compile(module, context);
prompt.metadata = {
  outputSchema: {
    type: 'object',
    properties: {
      relatedIssueIds: { type: 'array' },
      affectedComponents: { type: 'array' }
    }
  }
};

const result = await driver.query(prompt);
console.log(result.structuredOutput); // undefined (フィールド名が一致しないため)
```

```typescript
// ✅ 正しい - フィールド名が一致
const driver = new TestDriver({
  responses: [JSON.stringify({
    relatedIssueIds: ['issue-456'],
    affectedComponents: []
  })]
});

// 同じスキーマを使用
const result = await driver.query(prompt);
console.log(result.structuredOutput); // { relatedIssueIds: ['issue-456'], affectedComponents: [] }
```

### エッジケースの扱い

#### 複数のJSONオブジェクト

`extractJSON`は`multiple: false`オプションで最初の有効なJSONのみを抽出します：

```typescript
const driver = new TestDriver({
  responses: ['{"first": 1} {"second": 2}']
});
// result.structuredOutput = { first: 1 } // 最初のJSONのみ
```

#### 不完全なJSON

構文エラーがあるJSONは`undefined`を返します：

```typescript
const driver = new TestDriver({
  responses: ['{"broken": ']
});
// result.structuredOutput = undefined
```

#### 配列型のトップレベルJSON

トップレベルが配列のJSONも正しく処理されます：

```typescript
const driver = new TestDriver({
  responses: ['[1, 2, 3, 4, 5]']
});
// result.structuredOutput = [1, 2, 3, 4, 5] // 配列として返る
```

## 関連ドキュメント

- [DRIVER_API.md](./DRIVER_API.md) - ドライバーAPIの詳細
- [STRUCTURED_OUTPUTS.md](./STRUCTURED_OUTPUTS.md) - Structured Outputsの仕槕
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - テスト戦略