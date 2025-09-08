/**
 * MLX Driver API v2.0 機能テスト
 * 
 * 新しいAPI機能をテストするためのサンプルコード
 */
import { describe, test, expect } from 'vitest';
import { MlxProcess } from './index.js';

describe('MLX Driver API v2.0', () => {
  test('MlxProcess should be importable', () => {
    expect(MlxProcess).toBeDefined();
    expect(typeof MlxProcess).toBe('function');
  });
});

async function testMlxApiV2() {
  console.log('=== MLX Driver API v2.0 テスト ===\n');
  
  const modelName = 'Qwen/Qwen3-0.6B';
  const mlx = new MlxProcess(modelName);
  
  try {
    // 1. Capabilities APIテスト
    console.log('1. Capabilities API テスト');
    const capabilities = await mlx.getCapabilities();
    console.log('利用可能なメソッド:', capabilities.methods);
    console.log('Special tokens数:', Object.keys(capabilities.special_tokens).length);
    console.log('Chat template対応:', capabilities.features.apply_chat_template);
    if (capabilities.features.chat_template) {
      console.log('サポートされるrole:', capabilities.features.chat_template.supported_roles);
    }
    console.log('');

    // 2. Format Test APIテスト
    console.log('2. Format Test API テスト');
    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      { role: 'user' as const, content: 'Hello! How are you?' }
    ];
    
    const formatResult = await mlx.formatTest(messages, { primer: 'I am' });
    console.log('Template applied:', formatResult.template_applied);
    console.log('Formatted prompt:', formatResult.formatted_prompt?.slice(0, 100) + '...');
    if (formatResult.model_specific_processing) {
      console.log('Model specific processing applied');
    }
    console.log('');

    // 3. Chat APIテスト（短いレスポンス）
    console.log('3. Chat API テスト');
    const chatStream = await mlx.chat(messages, 'Hello', { max_tokens: 50 });
    
    let chatResponse = '';
    chatStream.on('data', (chunk) => {
      process.stdout.write(chunk);
      chatResponse += chunk;
    });
    
    await new Promise((resolve) => {
      chatStream.on('end', resolve);
    });
    
    console.log('\nChat完了\n');

    // 4. Completion APIテスト（短いレスポンス）
    console.log('4. Completion API テスト');
    const completionStream = await mlx.completion('The capital of Japan is', { max_tokens: 20 });
    
    let completionResponse = '';
    completionStream.on('data', (chunk) => {
      process.stdout.write(chunk);
      completionResponse += chunk;
    });
    
    await new Promise((resolve) => {
      completionStream.on('end', resolve);
    });
    
    console.log('\nCompletion完了\n');

    // 5. レガシー互換性テスト（chatメソッド使用）
    console.log('5. Direct chat APIテスト');
    const directChatStream = await mlx.chat(
      [{ role: 'user', content: 'Say hello' }],
      undefined,
      { max_tokens: 20 }
    );
    
    directChatStream.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
    
    await new Promise((resolve) => {
      directChatStream.on('end', resolve);
    });
    
    console.log('\nDirect chat APIテスト完了');

  } catch (error) {
    console.error('テストエラー:', error);
  } finally {
    mlx.exit();
    console.log('\n=== テスト完了 ===');
  }
}

// 直接実行の場合
if (import.meta.url === `file://${process.argv[1]}`) {
  testMlxApiV2().catch(console.error);
}

export { testMlxApiV2 };