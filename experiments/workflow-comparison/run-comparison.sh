#!/bin/bash

# Workflow Comparison Experiment: Agentic vs Self-Prompting
# Same task (meal planning), different workflows, compare outputs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_CASE="$SCRIPT_DIR/test-cases/meal-planning.json"
RESULTS_DIR="$SCRIPT_DIR/results"
PLANS_DIR="$SCRIPT_DIR/plans"

# Models to test
MODELS=(
  "mlx-community/gemma-3-27b-it-qat-4bit"
  "mlx-community/llm-jp-3.1-8x13b-instruct4-4bit"
)

MODEL_NAMES=(
  "gemma-27b"
  "llm-jp-8x13b"
)

echo "🧪 Workflow Comparison Experiment"
echo "=================================="
echo "Test Case: Meal Planning"
echo "Workflows: agentic vs self-prompting"
echo "Models: ${MODEL_NAMES[*]}"
echo ""

cd "$PROJECT_ROOT"

# Build the project first
echo "📦 Building project..."
npm run build -w @moduler-prompt/process
echo ""

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  MODEL_NAME="${MODEL_NAMES[$i]}"

  echo "🔬 Testing with ${MODEL_NAME}"
  echo "----------------------------------------"

  # Test with agentic-workflow
  echo "  📝 Running agentic-workflow..."
  MLX_MODEL="$MODEL" npx tsx packages/process/scripts/test-agentic-workflow.ts "$TEST_CASE" \
    > "$RESULTS_DIR/${MODEL_NAME}-agentic.txt" 2>&1 || true

  # Extract plan
  grep -A 100 "Raw planning output:" "$RESULTS_DIR/${MODEL_NAME}-agentic.txt" | \
    head -50 > "$PLANS_DIR/${MODEL_NAME}-agentic-plan.txt" || true

  echo "  ✅ Agentic workflow complete"

  # Test with self-prompting-workflow
  echo "  📝 Running self-prompting-workflow..."
  MLX_MODEL="$MODEL" npx tsx packages/process/scripts/test-self-prompting-workflow.ts "$TEST_CASE" \
    > "$RESULTS_DIR/${MODEL_NAME}-self-prompting.txt" 2>&1 || true

  # Extract plan
  grep -A 100 "Raw planning output:" "$RESULTS_DIR/${MODEL_NAME}-self-prompting.txt" | \
    head -50 > "$PLANS_DIR/${MODEL_NAME}-self-prompting-plan.txt" || true

  echo "  ✅ Self-prompting workflow complete"
  echo ""
done

echo "✨ Experiment complete!"
echo ""
echo "📊 Results saved to: $RESULTS_DIR"
echo "📋 Plans saved to: $PLANS_DIR"
echo ""
echo "Next steps:"
echo "  1. Compare final outputs in results/"
echo "  2. Compare planning strategies in plans/"
echo "  3. Analyze differences in step execution"
