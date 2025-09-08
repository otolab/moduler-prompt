#!/bin/bash

# MLX Model Runner Script
# This script runs the MLX Python process with uv --project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MLX_PYTHON_DIR="$PROJECT_ROOT/packages/driver/src/mlx-ml/python"

# Default model if not specified
MODEL_NAME="${1:-mlx-community/gemma-3-270m-it-qat-4bit}"

echo "Starting MLX model: $MODEL_NAME"
echo "Python directory: $MLX_PYTHON_DIR"

# Run with uv using --project to specify the project directory
cd "$MLX_PYTHON_DIR"
uv --project "$MLX_PYTHON_DIR" run python __main__.py "$MODEL_NAME"