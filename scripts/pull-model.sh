#!/bin/bash

# Script to pull a specific MLX model

if [ $# -eq 0 ]; then
    echo "Usage: $0 <model-name>"
    echo ""
    echo "Examples:"
    echo "  $0 mlx-community/gemma-3-270m-it-qat-4bit"
    echo "  $0 mlx-community/Llama-3.2-3B-Instruct-4bit"
    echo "  $0 mlx-community/Qwen3-270M-4bit"
    exit 1
fi

MODEL_NAME=$1

echo "Pulling model: $MODEL_NAME"
uv tool run --from mlx-lm mlx_lm.generate --model "$MODEL_NAME" --prompt 'hello!'

echo ""
echo "Model $MODEL_NAME has been pulled successfully!"