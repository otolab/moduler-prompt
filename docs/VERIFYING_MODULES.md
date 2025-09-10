# モジュールの動作確認手順

## 概要

作成したプロンプトモジュールが意図通りに動作するか確認する手順を説明する。

## 確認手順

### 1. テストファイルの作成

プロジェクトルートに`.mjs`ファイルを作成（ESモジュール形式）：

```javascript
// test-module.mjs
import { compile, createContext } from './packages/core/dist/index.js';
import { formatPrompt } from './packages/driver/dist/index.js';

const myModule = {
  createContext: () => ({
    // 初期データ
  }),
  
  objective: ['モジュールの目的'],
  
  // 動的コンテンツ
  state: [
    (ctx) => `状態: ${ctx.someValue}`
  ],
  
  // データセクション
  chunks: [
    (ctx) => ctx.items?.map((item, index) => ({
      type: 'chunk',
      content: item,
      partOf: 'input',
      index
    }))
  ]
};

// テスト実行
const context = createContext(myModule);
context.someValue = 'test';
context.items = ['item1', 'item2'];

const compiled = compile(myModule, context);
const promptText = formatPrompt(compiled);

console.log('生成されたプロンプト:');
console.log(promptText);
console.log('\nElement構造:');
console.log('Instructions:', compiled.instructions.length);
console.log('Data:', compiled.data.length);
console.log('Output:', compiled.output.length);
```

### 2. ビルドとテスト実行

```bash
# プロジェクトをビルド
npm run build

# テストを実行
node test-module.mjs
```

### 3. 出力の確認ポイント

#### プロンプト構造の確認

生成されたプロンプトが以下の構造を持つことを確認：

```
# Instructions
- 指示セクション（objective、instructions等）

# Data  
- データセクション（state、materials、chunks、messages）

# Output
- 出力セクション（cue、schema）
```

#### Element配置の確認

- **Instructions**：AIへの指示が含まれているか
- **Data**：入力データが正しく配置されているか
- **Output**：出力指示があれば含まれているか

#### 動的コンテンツの確認

- DynamicContentが正しく実行されているか
- nullを返した場合、出力から除外されているか
- 配列が正しく展開されているか

### 4. よくある問題と対処法

#### 問題1：データが出力されない

**原因**：DynamicContentがnullを返している

```javascript
// 悪い例
chunks: [
  (ctx) => ctx.items.map(...) // itemsがundefinedの場合エラー
]

// 良い例  
chunks: [
  (ctx) => ctx.items?.map(...) // Optional chaining
  // または
  (ctx) => {
    if (!ctx.items || ctx.items.length === 0) return null;
    return ctx.items.map(...);
  }
]
```

#### 問題2：オブジェクトが[object Object]として表示

**原因**：オブジェクトを文字列に変換していない

```javascript
// 悪い例
content: `Items: ${ctx.data}` // [object Object]と表示

// 良い例
content: `Items: ${ctx.data.map(d => d.name).join(', ')}`
// または
content: JSON.stringify(ctx.data, null, 2)
```

#### 問題3：Element型のエラー

**原因**：type定数の指定ミス

```javascript
// 悪い例
{ type: 'chunk', ... } // 型推論が効かない

// 良い例
{ type: 'chunk' as const, ... } // リテラル型として指定
```

### 5. デバッグ方法

#### CompiledPromptの内容確認

```javascript
// 各セクションの詳細を確認
console.log('Instructions詳細:');
compiled.instructions.forEach((el, i) => {
  console.log(`  ${i}: ${el.type}`);
  if (el.type === 'section') {
    console.log(`    title: ${el.title}`);
    console.log(`    items: ${el.items.length}個`);
  }
});
```

#### 中間データの確認

```javascript
// コンテキストの内容を確認
console.log('Context:', JSON.stringify(context, null, 2));

// DynamicContentの実行結果を個別に確認
const testResult = myModule.state[0](context);
console.log('Dynamic result:', testResult);
```

### 6. TypeScriptでの型チェック

より厳密な検証にはTypeScriptを使用：

```typescript
// test-module.ts
import { compile, createContext, type PromptModule } from '@moduler-prompt/core';

interface MyContext {
  items: string[];
  options: { verbose: boolean };
}

const myModule: PromptModule<MyContext> = {
  createContext: () => ({
    items: [],
    options: { verbose: false }
  }),
  // ... モジュール定義
};

// 型チェックが効く
const context = createContext(myModule);
context.items = ['test']; // OK
// context.invalid = 'error'; // 型エラー
```

### 7. 実際のAIモデルでのテスト

```javascript
import { TestDriver } from './packages/driver/dist/index.js';

// TestDriverでモック応答を確認
const driver = new TestDriver({
  responses: ['テスト応答']
});

const result = await driver.query(compiled);
console.log('AI応答:', result.content);
```

## まとめ

モジュールの動作確認は以下の流れで行う：

1. テストファイル作成
2. ビルド実行
3. プロンプト生成と確認
4. 問題があれば修正
5. 実際のドライバーでテスト

この手順により、モジュールが意図通りに動作することを確認できる。