"""
トークン関連のユーティリティ関数
"""
import sys


def is_eod_token(response, tokenizer):
    """
    レスポンスがEODトークンかどうかを判定する
    
    Args:
        response: stream_generateからのレスポンス
        tokenizer: tokenizerオブジェクト（必須）
        
    Returns:
        bool: EODトークンの場合True
    """
    # 1. finish_reasonによる終了判定（MLX-LMの標準的な方法）
    if hasattr(response, 'finish_reason') and response.finish_reason == 'stop':
        return True
    
    # 2. response.tokenによる終了トークン判定
    if hasattr(response, 'token'):
        token = response.token
        
        # special_tokens_mapとadded_tokens_encoderから終了トークンを取得
        end_token_ids = []
        
        # special_tokens_mapから標準的な終了トークンを取得
        if hasattr(tokenizer, 'special_tokens_map') and hasattr(tokenizer, 'added_tokens_encoder'):
            special_map = tokenizer.special_tokens_map
            added_encoder = tokenizer.added_tokens_encoder
            
            # EOSトークン
            eos_token_str = special_map.get('eos_token')
            if eos_token_str and eos_token_str in added_encoder:
                end_token_ids.append(added_encoder[eos_token_str])
            
            # その他の終了関連トークン
            end_related_keys = ['eoi_token']  # end_of_image
            for key in end_related_keys:
                token_str = special_map.get(key)
                if token_str and token_str in added_encoder:
                    end_token_ids.append(added_encoder[token_str])
        
        # added_tokens_encoderから直接取得（会話終了トークンなど）
        if hasattr(tokenizer, 'added_tokens_encoder'):
            added_encoder = tokenizer.added_tokens_encoder
            conversation_end_tokens = ['<end_of_turn>']
            for token_str in conversation_end_tokens:
                token_id = added_encoder.get(token_str)
                if token_id is not None:
                    end_token_ids.append(token_id)
        
        # フォールバック: 直接属性アクセス
        if hasattr(tokenizer, 'eos_token_id'):
            end_token_ids.append(tokenizer.eos_token_id)
        
        # 重複を除去してチェック
        if token in set(end_token_ids):
            return True

    return False


def get_special_tokens(tokenizer):
    """
    tokenizerから特殊トークンを取得する
    
    Returns:
        dict: special_tokens情報
    """
    special_tokens = {}
    
    # 標準的なspecial tokens（tokenizerに定義されているもの）
    standard_tokens = {
        "eod": tokenizer.eos_token,  # End of Document/Sequence
        "bos": tokenizer.bos_token,  # Beginning of Sequence  
        "unk": tokenizer.unk_token,  # Unknown token
        "pad": tokenizer.pad_token,  # Padding token
    }
    
    for name, token in standard_tokens.items():
        if token is not None:
            token_id = getattr(tokenizer, f"{name}_token_id", None)
            if token_id is not None:
                special_tokens[name] = {"text": token, "id": token_id}
    
    # ペアトークン（存在する場合のみ）
    pair_tokens = {
        # ChatML基本形式
        "system": ("<|system|>", "<|/system|>"),
        "user": ("<|user|>", "<|/user|>"),
        "assistant": ("<|assistant|>", "<|/assistant|>"),
        
        # フォーマット・構造化
        "code": ("<|code_start|>", "<|code_end|>"),
        "python": ("<|python|>", "<|/python|>"),
        "javascript": ("<|javascript|>", "<|/javascript|>"),
        "bash": ("<|bash|>", "<|/bash|>"),
        "quote": ("<|quote|>", "<|/quote|>"),
        "ref": ("<|ref|>", "<|/ref|>"),
        "citation": ("<|citation|>", "<|/citation|>"),
        "table": ("<|table|>", "<|/table|>"),
        "heading": ("<|heading|>", "<|/heading|>"),
        
        # メディア・リッチコンテンツ
        "image": ("<|image|>", "<|/image|>"),
        "audio": ("<|audio|>", "<|/audio|>"),
        "video": ("<|video|>", "<|/video|>"),
        
        # 機能・制御
        "tool_call": ("<|tool_call|>", "<|/tool_call|>"),
        "function": ("<|function|>", "<|/function|>"),
        "api": ("<|api|>", "<|/api|>"),
        "search": ("<|search|>", "<|/search|>"),
        "knowledge": ("<|knowledge|>", "<|/knowledge|>"),
        "context": ("<|context|>", "<|/context|>"),
        
        # 思考・推論
        "thinking": ("<|thinking|>", "</thinking>"),
        "reasoning": ("<|reasoning|>", "<|/reasoning|>"),
        "scratchpad": ("<|scratchpad|>", "<|/scratchpad|>"),
        "analysis": ("<|analysis|>", "<|/analysis|>"),
        "summary": ("<|summary|>", "<|/summary|>"),
        "explanation": ("<|explanation|>", "<|/explanation|>")
    }
    
    # 単体トークン（存在する場合のみ）
    single_tokens = {
        # Fill-in-the-Middle
        "fim_prefix": "<|fim_prefix|>",
        "fim_middle": "<|fim_middle|>", 
        "fim_suffix": "<|fim_suffix|>",
        
        # リスト・構造
        "list_item": "<|list_item|>",
        
        # メディア単体
        "vision": "<|vision|>",
        
        # 一般的なマークダウン風
        "code_inline": "`",
        "code_block_start": "```",
        "code_block_end": "```"
    }
    
    # ペアトークンの処理
    for name, (start_token, end_token) in pair_tokens.items():
        start_id = tokenizer.convert_tokens_to_ids(start_token)
        end_id = tokenizer.convert_tokens_to_ids(end_token)
        
        # unk_tokenでない場合のみ追加
        if start_id != tokenizer.unk_token_id and end_id != tokenizer.unk_token_id:
            special_tokens[name] = {
                "start": {"text": start_token, "id": start_id},
                "end": {"text": end_token, "id": end_id}
            }
    
    # 単体トークンの処理
    for name, token_text in single_tokens.items():
        token_id = tokenizer.convert_tokens_to_ids(token_text)
        
        # unk_tokenでない場合のみ追加
        if token_id != tokenizer.unk_token_id:
            special_tokens[name] = {"text": token_text, "id": token_id}
    
    return special_tokens


def get_chat_template_info(tokenizer):
    """チャットテンプレートの詳細情報を取得"""
    if not hasattr(tokenizer, 'apply_chat_template'):
        return None
    
    template_info = {
        "template_string": getattr(tokenizer, 'chat_template', None),
        "supported_roles": [],
        "preview": None,
        "constraints": {}
    }
    
    # サポートされるroleを検査
    test_roles = ["system", "user", "assistant", "tool", "function"]
    for role in test_roles:
        test_msg = [{"role": role, "content": "test"}]
        try:
            tokenizer.apply_chat_template(test_msg, tokenize=False, add_generation_prompt=False)
            template_info["supported_roles"].append(role)
        except:
            continue
    
    # プレビュー生成
    if template_info["supported_roles"]:
        sample_messages = []
        if "system" in template_info["supported_roles"]:
            sample_messages.append({"role": "system", "content": "You are a helpful assistant."})
        if "user" in template_info["supported_roles"]:
            sample_messages.append({"role": "user", "content": "Hello!"})
        if "assistant" in template_info["supported_roles"]:
            sample_messages.append({"role": "assistant", "content": "Hi there!"})
        
        try:
            template_info["preview"] = tokenizer.apply_chat_template(
                sample_messages, 
                tokenize=False,
                add_generation_prompt=False
            )
        except Exception as e:
            template_info["preview"] = f"Preview error: {e}"
    
    return template_info


def get_tokenizer_features(tokenizer):
    """
    tokenizerの機能情報を取得する
    
    Returns:
        dict: features情報
    """
    features = {
        "apply_chat_template": hasattr(tokenizer, 'apply_chat_template'),
        "vocab_size": tokenizer.vocab_size,
        "model_max_length": getattr(tokenizer, 'model_max_length', None)
    }
    
    # チャットテンプレート情報を追加
    chat_template_info = get_chat_template_info(tokenizer)
    if chat_template_info:
        features["chat_template"] = chat_template_info
    
    return features


def get_capabilities(tokenizer):
    """
    tokenizerの全機能情報を取得する（capabilities API用）
    
    Returns:
        dict: capabilities情報
    """
    # 基本メソッド
    methods = ["capabilities", "completion", "format_test"]
    
    # apply_chat_templateがある場合はchatメソッドを追加
    if hasattr(tokenizer, 'apply_chat_template'):
        methods.append("chat")
    
    capabilities = {
        "methods": methods,
        "special_tokens": get_special_tokens(tokenizer),
        "features": get_tokenizer_features(tokenizer)
    }
    
    return capabilities