#!/bin/bash

# Setup script for MLX Python environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MLX_PYTHON_DIR="$PROJECT_ROOT/packages/driver/src/mlx-ml/python"

echo "Setting up MLX Python environment..."
echo "Directory: $MLX_PYTHON_DIR"

cd "$MLX_PYTHON_DIR"

# Install dependencies using uv
echo "Installing dependencies with uv..."
uv --project "$MLX_PYTHON_DIR" sync

echo ""
echo "Setup completed!"
echo "You can now run: ./scripts/test-chat.sh"