#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pythonDir = join(__dirname, '..', 'src', 'mlx-ml', 'python');
const distPythonDir = join(__dirname, '..', 'dist', 'mlx-ml', 'python');

// Check Python directory
const targetDir = existsSync(distPythonDir) ? distPythonDir : pythonDir;

if (!existsSync(targetDir)) {
  console.error('❌ MLX Python directory not found.');
  console.error('   Please run "npm run setup-mlx" first.');
  process.exit(1);
}

console.log('📦 Downloading test model...');
console.log(`📁 Working directory: ${targetDir}\n`);

// Get model name from command line arguments or use default
const modelName = process.argv[2] || 'mlx-community/gemma-3-270m-it-4bit';

try {
  execSync(
    `uv run mlx_lm.generate --model ${modelName} --prompt 'test' --max-tokens 1`,
    {
      cwd: targetDir,
      stdio: 'inherit'
    }
  );
  console.log('\n✅ Model downloaded successfully!');
  console.log(`   Model: ${modelName}`);
} catch (error) {
  console.error('\n❌ Failed to download model:', error.message);
  process.exit(1);
}
