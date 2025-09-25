#!/usr/bin/env python3
"""
特殊トークンの調査スクリプト
利用可能なモデルの特殊トークンを実際に確認する
"""

import json
import sys
from typing import Dict, Any, List
from pathlib import Path

# MLX関連のインポート
try:
    from mlx_lm import load
    from transformers import AutoTokenizer
except ImportError as e:
    print(f"Error importing required libraries: {e}", file=sys.stderr)
    print("Please install mlx-lm and transformers", file=sys.stderr)
    sys.exit(1)

from token_utils import get_special_tokens, get_capabilities


def test_model_tokens(model_name: str) -> Dict[str, Any]:
    """
    指定されたモデルの特殊トークンを取得する

    Args:
        model_name: モデル名（例: "mlx-community/gemma-2-2b-it-4bit"）

    Returns:
        特殊トークン情報の辞書
    """
    print(f"\n{'='*60}")
    print(f"Testing model: {model_name}")
    print('='*60)

    try:
        # Tokenizerをロード
        tokenizer = AutoTokenizer.from_pretrained(model_name)

        # 基本情報を表示
        print(f"Tokenizer class: {tokenizer.__class__.__name__}")
        print(f"Vocab size: {tokenizer.vocab_size}")

        # special_tokens_mapを確認
        if hasattr(tokenizer, 'special_tokens_map'):
            print("\nSpecial tokens map:")
            for key, value in tokenizer.special_tokens_map.items():
                print(f"  {key}: {value}")

        # added_tokens_encoderを確認
        if hasattr(tokenizer, 'added_tokens_encoder'):
            print(f"\nAdded tokens count: {len(tokenizer.added_tokens_encoder)}")
            # 最初の10個を表示
            for i, (token, token_id) in enumerate(tokenizer.added_tokens_encoder.items()):
                if i >= 10:
                    print(f"  ... and {len(tokenizer.added_tokens_encoder) - 10} more")
                    break
                print(f"  {token}: {token_id}")

        # token_utilsから特殊トークンを取得
        special_tokens = get_special_tokens(tokenizer)

        # capabilities全体を取得
        capabilities = get_capabilities(tokenizer)

        # 結果を整理
        result = {
            "model": model_name,
            "tokenizer_class": tokenizer.__class__.__name__,
            "vocab_size": tokenizer.vocab_size,
            "special_tokens_map": tokenizer.special_tokens_map if hasattr(tokenizer, 'special_tokens_map') else {},
            "added_tokens_count": len(tokenizer.added_tokens_encoder) if hasattr(tokenizer, 'added_tokens_encoder') else 0,
            "extracted_special_tokens": special_tokens,
            "capabilities": capabilities
        }

        # 見つかった特殊トークンを分類して表示
        print("\n" + "="*40)
        print("EXTRACTED SPECIAL TOKENS:")
        print("="*40)

        # 標準トークン
        standard_tokens = ["eod", "bos", "unk", "pad"]
        found_standard = {k: v for k, v in special_tokens.items() if k in standard_tokens}
        if found_standard:
            print("\n[Standard Tokens]")
            for name, info in found_standard.items():
                if isinstance(info, dict) and 'text' in info:
                    print(f"  {name}: '{info['text']}' (id={info['id']})")

        # ロールトークン（チャット関連）
        role_tokens = ["system", "user", "assistant"]
        found_roles = {k: v for k, v in special_tokens.items() if k in role_tokens}
        if found_roles:
            print("\n[Role Tokens]")
            for name, info in found_roles.items():
                if isinstance(info, dict) and 'start' in info:
                    print(f"  {name}:")
                    print(f"    start: '{info['start']['text']}' (id={info['start']['id']})")
                    print(f"    end: '{info['end']['text']}' (id={info['end']['id']})")

        # 構造化トークン
        structure_tokens = ["code", "quote", "citation", "context", "table", "heading", "ref"]
        found_structure = {k: v for k, v in special_tokens.items() if k in structure_tokens}
        if found_structure:
            print("\n[Structure Tokens]")
            for name, info in found_structure.items():
                if isinstance(info, dict) and 'start' in info:
                    print(f"  {name}:")
                    print(f"    start: '{info['start']['text']}' (id={info['start']['id']})")
                    print(f"    end: '{info['end']['text']}' (id={info['end']['id']})")

        # コード関連トークン
        code_tokens = ["python", "javascript", "bash", "code_inline", "code_block_start", "code_block_end"]
        found_code = {k: v for k, v in special_tokens.items() if k in code_tokens}
        if found_code:
            print("\n[Code Tokens]")
            for name, info in found_code.items():
                if isinstance(info, dict):
                    if 'start' in info:
                        print(f"  {name}:")
                        print(f"    start: '{info['start']['text']}' (id={info['start']['id']})")
                        print(f"    end: '{info['end']['text']}' (id={info['end']['id']})")
                    elif 'text' in info:
                        print(f"  {name}: '{info['text']}' (id={info['id']})")

        # 思考・推論トークン
        thinking_tokens = ["thinking", "reasoning", "scratchpad", "analysis", "summary", "explanation"]
        found_thinking = {k: v for k, v in special_tokens.items() if k in thinking_tokens}
        if found_thinking:
            print("\n[Thinking/Reasoning Tokens]")
            for name, info in found_thinking.items():
                if isinstance(info, dict) and 'start' in info:
                    print(f"  {name}:")
                    print(f"    start: '{info['start']['text']}' (id={info['start']['id']})")
                    print(f"    end: '{info['end']['text']}' (id={info['end']['id']})")

        # その他のトークン
        all_categories = set(standard_tokens + role_tokens + structure_tokens + code_tokens + thinking_tokens)
        other_tokens = {k: v for k, v in special_tokens.items() if k not in all_categories}
        if other_tokens:
            print("\n[Other Tokens]")
            for name, info in other_tokens.items():
                if isinstance(info, dict):
                    if 'start' in info:
                        print(f"  {name}:")
                        print(f"    start: '{info['start']['text']}' (id={info['start']['id']})")
                        print(f"    end: '{info['end']['text']}' (id={info['end']['id']})")
                    elif 'text' in info:
                        print(f"  {name}: '{info['text']}' (id={info['id']})")

        # チャットテンプレート機能
        if capabilities.get('features', {}).get('chat_template'):
            print("\n[Chat Template Support]")
            chat_info = capabilities['features']['chat_template']
            print(f"  Supported roles: {', '.join(chat_info['supported_roles'])}")
            if chat_info.get('preview'):
                print(f"  Template preview:")
                print(f"    {chat_info['preview'][:200]}...")

        return result

    except Exception as e:
        print(f"Error testing model {model_name}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return {
            "model": model_name,
            "error": str(e)
        }


def main():
    # テストするモデルのリスト
    test_models = [
        # Gemmaモデル
        "mlx-community/gemma-2-2b-it-4bit",
        "mlx-community/gemma-2-9b-it-4bit",

        # Llama系
        "mlx-community/Llama-3.2-3B-Instruct-4bit",

        # Qwen系
        "mlx-community/Qwen2.5-3B-Instruct-4bit",

        # Phi系
        "mlx-community/Phi-3.5-mini-instruct-4bit"
    ]

    # 引数でモデルが指定された場合はそれを使用
    if len(sys.argv) > 1:
        test_models = sys.argv[1:]

    results = []

    for model_name in test_models:
        try:
            result = test_model_tokens(model_name)
            results.append(result)
        except Exception as e:
            print(f"Failed to test {model_name}: {e}", file=sys.stderr)
            results.append({
                "model": model_name,
                "error": str(e)
            })

    # 結果をJSONファイルに保存
    output_file = Path(__file__).parent / "special_tokens_report.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Results saved to: {output_file}")
    print('='*60)

    # サマリを表示
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    for result in results:
        model = result['model']
        if 'error' in result:
            print(f"\n{model}: ERROR - {result['error']}")
        else:
            tokens = result.get('extracted_special_tokens', {})
            # 標準以外のトークンをカウント
            standard = ["eod", "bos", "unk", "pad"]
            non_standard = {k: v for k, v in tokens.items() if k not in standard}
            print(f"\n{model}:")
            print(f"  Tokenizer: {result.get('tokenizer_class', 'Unknown')}")
            print(f"  Standard tokens: {len([k for k in tokens if k in standard])}")
            print(f"  Special tokens found: {len(non_standard)}")
            if non_standard:
                print(f"  Found: {', '.join(list(non_standard.keys())[:10])}")
                if len(non_standard) > 10:
                    print(f"         ... and {len(non_standard) - 10} more")


if __name__ == "__main__":
    main()