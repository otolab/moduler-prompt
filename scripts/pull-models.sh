#!/bin/bash

# Script to pull MLX models

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Pulling MLX models..."
echo ""

# Function to pull a model
pull_model() {
    local model_name=$1
    echo "Pulling model: $model_name"
    uv tool run --from mlx-lm mlx_lm.generate --model "$model_name" --prompt 'hello!'
    echo ""
}

# Small models (for testing and development)
echo "=== Small Models (Recommended for testing) ==="
pull_model "mlx-community/gemma-3-270m-it-qat-4bit"
pull_model "mlx-community/Qwen3-270M-4bit"

# Medium models
echo "=== Medium Models ==="
pull_model "mlx-community/Llama-3.2-3B-Instruct-4bit"

echo "Model pulling completed!"
echo "You can now use these models with the simple-chat CLI"