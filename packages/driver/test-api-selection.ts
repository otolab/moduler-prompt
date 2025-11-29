import { compile } from '@moduler-prompt/core';
import { MlxDriver } from './src/index.js';

async function test() {
  console.log('Testing force-completion API selection...');

  const driver = new MlxDriver({
    model: 'mlx-community/gemma-2-2b-it-4bit',
    modelSpec: {
      apiStrategy: 'force-completion'
    }
  });

  const prompt = compile({
    objective: ['Test'],
    instructions: ['Say hello in one sentence']
  });

  console.log('Querying...');
  const result = await driver.query(prompt);
  console.log('\nResult:', result.content.substring(0, 100));

  await driver.close();
}

test().catch(console.error);
