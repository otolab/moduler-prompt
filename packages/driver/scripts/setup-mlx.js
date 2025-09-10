#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pythonDir = join(__dirname, '..', 'src', 'mlx-ml', 'python');
const distPythonDir = join(__dirname, '..', 'dist', 'mlx-ml', 'python');

console.log('🚀 Setting up MLX driver dependencies...\n');

// Check Python directory
const targetDir = existsSync(distPythonDir) ? distPythonDir : pythonDir;

if (!existsSync(targetDir)) {
  console.log('⚠️  MLX Python directory not found. Skipping setup.');
  console.log('   MLX driver will not be available.');
  process.exit(0);
}

console.log(`📁 Working directory: ${targetDir}`);

// Check if uv is installed
try {
  execSync('uv --version', { stdio: 'ignore' });
  console.log('✅ uv is installed');
} catch {
  console.log('⚠️  uv is not installed. Installing uv...');
  try {
    execSync('curl -LsSf https://astral.sh/uv/install.sh | sh', { stdio: 'inherit' });
    console.log('✅ uv installed successfully');
  } catch (error) {
    console.error('❌ Failed to install uv. Please install it manually:');
    console.error('   curl -LsSf https://astral.sh/uv/install.sh | sh');
    console.error('\n   MLX driver will not be available without uv.');
    process.exit(0);
  }
}

// Setup Python environment
console.log('\n📦 Setting up Python environment...');
try {
  execSync('uv venv', { cwd: targetDir, stdio: 'inherit' });
  execSync('uv pip install -e .', { cwd: targetDir, stdio: 'inherit' });
  console.log('\n✅ MLX driver setup completed successfully!');
  console.log('   You can now use MlxDriver from @moduler-prompt/driver');
} catch (error) {
  console.error('❌ Failed to setup Python environment:', error.message);
  console.error('   MLX driver will not be available.');
  process.exit(0);
}