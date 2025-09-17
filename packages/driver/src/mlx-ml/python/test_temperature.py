#!/usr/bin/env python
"""
temperatureパラメータが正しく処理されることを確認するテストスクリプト
"""

from mlx_lm import load, stream_generate
import sys

# テスト用の小さなモデル
model_name = "mlx-community/gemma-3-270m-it-qat-4bit"

print(f"Loading model: {model_name}")
model, tokenizer = load(model_name)
print("Model loaded successfully")

# テストケース
test_cases = [
    {"max_tokens": 1, "temperature": 0.5},
    {"max_tokens": 1, "temperature": 0},
    {"max_tokens": 1, "temperature": 1.0},
]

for i, options in enumerate(test_cases, 1):
    print(f"\nTest case {i}: {options}")
    try:
        # stream_generateに**kwargsとして渡す
        result = list(stream_generate(model, tokenizer, "Hello", **options))
        print(f"✓ Success: Got {len(result)} tokens")
    except TypeError as e:
        if "unexpected keyword argument" in str(e):
            print(f"✗ Failed: {e}")
            sys.exit(1)
        else:
            raise
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        sys.exit(1)

print("\n✅ All tests passed! temperature parameter is accepted correctly.")
