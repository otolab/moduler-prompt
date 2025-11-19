#!/bin/bash

# ENテストのみを実行するスクリプト

set -e

# プロジェクトルートに移動
cd "$(dirname "$0")/../.."
PROJECT_ROOT="$(pwd)"

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 結果ディレクトリ
RESULTS_DIR="experiments/agentic-workflow-model-comparison/results"

# モデル定義（plans/README.mdから）
MODELS=(
    "mlx-community/qwq-bakeneko-32b-4bit|qwq-bakeneko-32b|QwQ-Bakeneko 32B"
    "mlx-community/gemma-3-27b-it-qat-4bit|gemma-27b|Gemma 27B"
    "mlx-community/llm-jp-3.1-8x13b-instruct4-4bit|llm-jp-8x13b|LLM-JP 8x13B"
    "mlx-community/gemma-3n-E4B-it-lm-4bit|gemma-4b|Gemma 4B"
    "mlx-community/granite-4.0-h-tiny-6bit-MLX|granite-tiny-7b|Granite Tiny 7B"
    "mlx-community/granite-4.0-h-1b-4bit|granite-1b|Granite 1B"
    "mlx-community/gemma-3-270m-it-qat-4bit|gemma-270m|Gemma 270M"
)

# テスト実行関数
run_test() {
    local model_id=$1
    local file_prefix=$2
    local model_name=$3

    local output_file="${RESULTS_DIR}/${file_prefix}-en-freeform-v19.txt"
    local test_case_file="experiments/agentic-workflow-model-comparison/test-cases/meal-planning-en.json"

    echo -e "${GREEN}[開始]${NC} ${model_name} (英語)"
    echo "  モデル: ${model_id}"
    echo "  テストケース: ${test_case_file}"
    echo "  出力: ${output_file}"

    # テスト実行
    if FREEFORM_EXECUTION=true \
       MLX_MODEL="${model_id}" \
       npx tsx packages/process/scripts/test-agentic-workflow.ts "${test_case_file}" \
       > "${output_file}" 2>&1; then
        echo -e "${GREEN}[完了]${NC} ${model_name} (英語)"
    else
        echo -e "${RED}[失敗]${NC} ${model_name} (英語)"
        echo "  エラーログ: ${output_file}"
    fi
    echo ""
}

# ヘッダー
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Agentic Workflow v19 - ENテストのみ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "テスト対象モデル数: ${#MODELS[@]}"
echo ""

# 各モデルでテスト実行
for model_spec in "${MODELS[@]}"; do
    IFS='|' read -r model_id file_prefix model_name <<< "$model_spec"
    run_test "$model_id" "$file_prefix" "$model_name"
done

# 完了メッセージ
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}全ENテスト完了: ${#MODELS[@]}件${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "結果ディレクトリ: ${RESULTS_DIR}"
echo ""
echo "次のステップ:"
echo "  1. 結果ファイルを確認: ls -lh ${RESULTS_DIR}/*-en-v19.txt"
echo "  2. JA vs JA-2 vs EN比較分析"
