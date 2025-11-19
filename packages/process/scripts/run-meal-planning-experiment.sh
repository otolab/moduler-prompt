#!/bin/bash

# 献立計画タスクのモデル比較実験スクリプト
# 中間出力を含めて各モデルの動作を評価

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/experiments/agentic-workflow-model-comparison/results"
mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "献立計画タスク - モデル比較実験"
echo "========================================="
echo ""
echo "出力ディレクトリ: $OUTPUT_DIR"
echo ""

# テスト対象モデル
MODELS=(
  "mlx-community/qwq-bakeneko-32b-4bit"
  "mlx-community/gemma-3-27b-it-qat-4bit"
  "mlx-community/llm-jp-3.1-8x13b-instruct4-4bit"
  "mlx-community/gemma-3n-E4B-it-lm-4bit"
  "mlx-community/granite-4.0-h-tiny-6bit-MLX"
  "mlx-community/granite-4.0-h-1b-4bit"
  "mlx-community/gemma-3-270m-it-qat-4bit"
)

MODEL_NAMES=(
  "qwq-bakeneko-32b"
  "gemma-27b"
  "llm-jp-8x13b"
  "gemma-3n-4b"
  "granite-tiny-7b"
  "granite-1b"
  "gemma-270m"
)

# 各モデルで実行
for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  NAME="${MODEL_NAMES[$i]}"
  OUTPUT_FILE="$OUTPUT_DIR/${NAME}.txt"

  echo "----------------------------------------"
  echo "モデル: $MODEL"
  echo "出力: $OUTPUT_FILE"
  echo "----------------------------------------"

  MLX_MODEL="$MODEL" npx tsx "$SCRIPT_DIR/test-agentic-workflow.ts" \
    2>&1 | tee "$OUTPUT_FILE"

  echo ""
  echo "✓ 完了: $NAME"
  echo ""
done

echo "========================================="
echo "全モデルの実行完了"
echo "========================================="
echo ""
echo "結果ファイル:"
ls -lh "$OUTPUT_DIR"/*.txt
echo ""
echo "結果の比較:"
echo "  cat $OUTPUT_DIR/qwq-bakeneko-32b.txt"
echo "  cat $OUTPUT_DIR/gemma-27b.txt"
echo "  cat $OUTPUT_DIR/llm-jp-8x13b.txt"
echo "  cat $OUTPUT_DIR/gemma-3n-4b.txt"
echo "  cat $OUTPUT_DIR/granite-tiny-7b.txt"
echo "  cat $OUTPUT_DIR/granite-1b.txt"
echo "  cat $OUTPUT_DIR/gemma-270m.txt"
