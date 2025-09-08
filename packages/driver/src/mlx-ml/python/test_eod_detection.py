#!/usr/bin/env python3
"""
EODトークン検出のテストスクリプト
MLX-LMの実際のレスポンス構造を調査し、is_eod_token関数を検証する
"""

import sys
from mlx_lm import load, stream_generate
from token_utils import is_eod_token

def test_eod_detection():
    """EODトークン検出のテスト"""
    # モデルとトークナイザーのロード
    model_name = sys.argv[1] if len(sys.argv) > 1 else "mlx-community/gemma-3-270m-it-4bit"
    print(f"Loading model: {model_name}", file=sys.stderr)
    
    try:
        model, tokenizer = load(model_name)
    except Exception as e:
        print(f"Model loading failed: {e}", file=sys.stderr)
        return
    
    # EOSトークン情報
    eos_token_text = tokenizer.eos_token
    eos_token_id = tokenizer.eos_token_id
    print(f"EOS Token: '{eos_token_text}' (ID: {eos_token_id})", file=sys.stderr)
    
    # 特殊トークンも取得してみる
    end_of_turn_id = tokenizer.convert_tokens_to_ids("<end_of_turn>")
    print(f"end_of_turn Token ID: {end_of_turn_id}", file=sys.stderr)
    print(f"unk_token_id: {tokenizer.unk_token_id}", file=sys.stderr)
    
    # チャットテンプレートを使った適切なプロンプト
    if hasattr(tokenizer, 'apply_chat_template') and tokenizer.chat_template is not None:
        messages = [{"role": "user", "content": "Say hello and stop."}]
        test_prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        print(f"Using chat template. Test prompt: '{test_prompt}'", file=sys.stderr)
    else:
        test_prompt = "Hello! How are you?"
        print(f"No chat template. Test prompt: '{test_prompt}'", file=sys.stderr)
    
    # ストリーム生成のテスト
    print("=== Stream Generation Test ===", file=sys.stderr)
    response_count = 0
    
    for response in stream_generate(model, tokenizer, test_prompt, max_tokens=50):
        response_count += 1
        print(f"\n--- Response {response_count} ---", file=sys.stderr)
        print(f"Type: {type(response)}", file=sys.stderr)
        print(f"Attributes: {dir(response)}", file=sys.stderr)
        
        if hasattr(response, 'text'):
            print(f"Text: '{response.text}'", file=sys.stderr)
        if hasattr(response, 'token'):
            print(f"Token ID: {response.token}", file=sys.stderr)
        if hasattr(response, 'tokens'):
            print(f"Tokens: {response.tokens}", file=sys.stderr)
        if hasattr(response, 'token_id'):
            print(f"Token ID (alt): {response.token_id}", file=sys.stderr)
        if hasattr(response, 'token_ids'):
            print(f"Token IDs: {response.token_ids}", file=sys.stderr)
        if hasattr(response, 'finish_reason'):
            print(f"Finish reason: {response.finish_reason}", file=sys.stderr)
        
        # EOD検出テスト
        is_eod = is_eod_token(response, tokenizer)
        print(f"is_eod_token result: {is_eod}", file=sys.stderr)
        
        # 検出方法の詳細
        if is_eod:
            if hasattr(response, 'finish_reason') and response.finish_reason is not None:
                print(f"  -> Detected via finish_reason: {response.finish_reason}", file=sys.stderr)
            elif hasattr(response, 'token') and tokenizer is not None:
                print(f"  -> Detected via token: {response.token}", file=sys.stderr)
        
        if is_eod:
            print("EOD detected! Breaking.", file=sys.stderr)
            break
        
        if response_count > 20:  # 無限ループ防止
            print("Too many responses, breaking.", file=sys.stderr)
            break
    
    print(f"\nTotal responses processed: {response_count}", file=sys.stderr)

if __name__ == "__main__":
    test_eod_detection()