/**
 * llm-jp-3.1に直接質問するスクリプト
 */

import { MlxDriver } from '@modular-prompt/driver';
import { compile, type PromptModule } from '@modular-prompt/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionContext {
  question: string;
}

const questionModule: PromptModule<QuestionContext> = {
  createContext: (): QuestionContext => ({
    question: ''
  }),

  objective: [
    'あなたは日本語を理解し日本語で応答するAIアシスタントです。',
    'ユーザーの質問に対して、明確で具体的な回答を提供してください。'
  ],

  instructions: [
    'わかりやすい日本語で回答する',
    '具体的な改善案を提示する',
    '技術的な詳細も含める'
  ],

  cue: [
    (ctx) => `ユーザーの質問:\n${ctx.question}`,
    '',
    'あなたの回答:'
  ]
};

async function main() {
  // 質問を読み込む（引数で指定可能）
  const questionFile = process.argv[2] || 'question-to-llm-jp.txt';
  const questionPath = path.join(__dirname, '../../../experiments/agentic-workflow-model-comparison', questionFile);
  const question = fs.readFileSync(questionPath, 'utf-8');

  console.log('🤖 llm-jp-3.1に質問を送信します...\n');
  console.log('📝 質問内容:');
  console.log(question);
  console.log('\n' + '='.repeat(80) + '\n');

  // ドライバーを作成
  const driver = new MlxDriver({
    model: 'mlx-community/llm-jp-3.1-8x13b-instruct4-4bit',
    defaultOptions: {
      temperature: 0.7,
      maxTokens: 4000
    }
  });

  try {
    // コンテキストを作成
    const context = questionModule.createContext!();
    context.question = question;

    // プロンプトをコンパイル
    const compiledPrompt = compile(questionModule, context);

    console.log('🔄 モデルから回答を取得中...\n');

    // ストリーミングで回答を取得
    if (driver.streamQuery) {
      const streamResult = await driver.streamQuery(compiledPrompt);

      console.log('💬 llm-jp-3.1の回答:\n');
      let response = '';
      for await (const chunk of streamResult.stream) {
        process.stdout.write(chunk);
        response += chunk;
      }
      console.log('\n');

      // 回答を保存
      const answerFile = questionFile.replace('.txt', '-answer.txt');
      const answerPath = path.join(__dirname, '../../../experiments/agentic-workflow-model-comparison', answerFile);
      fs.writeFileSync(answerPath, response, 'utf-8');
      console.log(`\n✅ 回答を experiments/agentic-workflow-model-comparison/${answerFile} に保存しました`);
    }
  } finally {
    if (driver.close) {
      await driver.close();
    }
  }
}

main().catch(console.error);
