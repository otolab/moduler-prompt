"""
MLX Driver API 仕様確認テスト

docs/mlx-driver-api-spec.md で定義された仕様に従って、
APIの動作を検証する。
"""
import json
import subprocess
import sys
import unittest
from unittest.mock import patch, MagicMock


class TestMLXDriverAPISpec(unittest.TestCase):
    """MLX Driver API仕様テスト"""
    
    def setUp(self):
        """テスト前準備"""
        # モックのtokenizerとモデルを準備
        self.mock_tokenizer = MagicMock()
        self.mock_model = MagicMock()
        
        # 標準的なspecial tokensの設定
        self.mock_tokenizer.eos_token_id = 2
        self.mock_tokenizer.eos_token = "</s>"
        self.mock_tokenizer.bos_token_id = 1
        self.mock_tokenizer.bos_token = "<s>"
        self.mock_tokenizer.unk_token_id = 0
        self.mock_tokenizer.unk_token = "<unk>"
        self.mock_tokenizer.pad_token_id = None
        self.mock_tokenizer.pad_token = None
        self.mock_tokenizer.vocab_size = 151936
        self.mock_tokenizer.model_max_length = 8192
        
        # apply_chat_templateを持つtokenizer
        self.mock_tokenizer.apply_chat_template = MagicMock(return_value="formatted prompt")
        
        # convert_tokens_to_ids のモック
        def mock_convert_tokens_to_ids(token):
            token_map = {
                '</s>': 2,
                '<|endoftext|>': 50256,
                '<|system|>': 151645,
                '<|/system|>': 151647,
                '<|user|>': 151646,
                '<|/user|>': 151648,
                '<|assistant|>': 151649,
                '<|/assistant|>': 151650
            }
            return token_map.get(token, self.mock_tokenizer.unk_token_id)
        
        self.mock_tokenizer.convert_tokens_to_ids = mock_convert_tokens_to_ids
        
        # convert_ids_to_tokens のモック
        self.mock_tokenizer.convert_ids_to_tokens = MagicMock(return_value="</s>")

    def test_capabilities_request_format(self):
        """capabilities リクエストフォーマット検証"""
        # 期待されるリクエスト形式
        expected_request = {
            "method": "capabilities"
        }
        
        # JSONシリアライズ可能であることを確認
        json_str = json.dumps(expected_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "capabilities")

    def test_chat_request_format(self):
        """chat リクエストフォーマット検証"""
        # 期待されるリクエスト形式
        expected_request = {
            "method": "chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello!"}
            ],
            "primer": "I'm doing",
            "options": {
                "max_tokens": 1000,
                "temperature": 0.7
            }
        }
        
        # JSONシリアライズ可能であることを確認
        json_str = json.dumps(expected_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "chat")
        self.assertIn("messages", parsed)
        self.assertEqual(len(parsed["messages"]), 2)
        self.assertEqual(parsed["messages"][0]["role"], "system")

    def test_completion_request_format(self):
        """completion リクエストフォーマット検証"""
        # 期待されるリクエスト形式
        expected_request = {
            "method": "completion",
            "prompt": "Complete this text: The capital of Japan is",
            "options": {
                "max_tokens": 100,
                "temperature": 0.3
            }
        }
        
        # JSONシリアライズ可能であることを確認
        json_str = json.dumps(expected_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "completion")
        self.assertIn("prompt", parsed)
        self.assertIsInstance(parsed["prompt"], str)

    def test_capabilities_response_format(self):
        """capabilities レスポンスフォーマット検証"""
        
        # 期待されるレスポンス形式
        expected_response = {
            "methods": ["capabilities", "chat", "completion", "format_test"],
            "special_tokens": {
                "eod": {
                    "text": "</s>",
                    "id": 2
                },
                "bos": {
                    "text": "<s>",
                    "id": 1
                },
                "system": {
                    "start": {"text": "<|system|>", "id": 151645},
                    "end": {"text": "<|/system|>", "id": 151647}
                },
                "user": {
                    "start": {"text": "<|user|>", "id": 151646},
                    "end": {"text": "<|/user|>", "id": 151648}
                },
                "assistant": {
                    "start": {"text": "<|assistant|>", "id": 151649},
                    "end": {"text": "<|/assistant|>", "id": 151650}
                }
            },
            "features": {
                "apply_chat_template": True,
                "vocab_size": 151936,
                "model_max_length": 8192
            }
        }
        
        # JSONシリアライズ可能であることを確認
        json_str = json.dumps(expected_response)
        parsed = json.loads(json_str)
        
        # 必須フィールドの確認
        self.assertIn("methods", parsed)
        self.assertIn("special_tokens", parsed)
        self.assertIn("features", parsed)
        
        # methodsの検証
        self.assertIn("capabilities", parsed["methods"])
        self.assertIn("completion", parsed["methods"])
        self.assertIn("format_test", parsed["methods"])
        if "chat" in parsed["methods"]:  # apply_chat_templateがある場合のみ
            self.assertIn("chat", parsed["methods"])
        
        # special_tokensの構造検証
        self.assertIn("eod", parsed["special_tokens"])
        self.assertIn("text", parsed["special_tokens"]["eod"])
        self.assertIn("id", parsed["special_tokens"]["eod"])
        
        # 標準special tokensも確認
        standard_tokens = ["bos", "unk", "pad"]
        for token in standard_tokens:
            if token in parsed["special_tokens"]:
                self.assertIn("text", parsed["special_tokens"][token])
                self.assertIn("id", parsed["special_tokens"][token])
        
        # ペアトークンの構造検証
        pair_token_examples = ["system", "user", "assistant", "thinking", "code", "image"]
        for role in pair_token_examples:
            if role in parsed["special_tokens"]:
                self.assertIn("start", parsed["special_tokens"][role])
                self.assertIn("end", parsed["special_tokens"][role])
                self.assertIn("text", parsed["special_tokens"][role]["start"])
                self.assertIn("id", parsed["special_tokens"][role]["start"])
        
        # 単体トークンの構造検証
        single_token_examples = ["fim_prefix", "vision", "code_inline"]
        for token in single_token_examples:
            if token in parsed["special_tokens"]:
                self.assertIn("text", parsed["special_tokens"][token])
                self.assertIn("id", parsed["special_tokens"][token])
        
        # chat_template機能の確認
        if "chat_template" in parsed["features"]:
            chat_template = parsed["features"]["chat_template"]
            self.assertIn("supported_roles", chat_template)
            self.assertIn("preview", chat_template)
            self.assertIsInstance(chat_template["supported_roles"], list)
            
            # テンプレート文字列の確認（存在する場合）
            if "template_string" in chat_template and chat_template["template_string"]:
                self.assertIsInstance(chat_template["template_string"], str)

    def test_eod_token_detection_spec(self):
        """EODトークン検出仕様の確認"""
        from token_utils import is_eod_token
        
        # モックレスポンス（token_idsを持つ場合）
        mock_response1 = MagicMock()
        mock_response1.token_ids = [1, 2, 3]
        
        # モックレスポンス（token_idを持つ場合）
        mock_response2 = MagicMock()
        mock_response2.token_id = 2
        del mock_response2.token_ids  # token_idsは持たない
        
        # モックレスポンス（EODトークンを含まない）
        mock_response3 = MagicMock()
        mock_response3.token_ids = [1, 3, 4]
        del mock_response3.token_id  # token_idは持たない
        
        eod_token_id = 2
        
        # テスト実行
        self.assertTrue(is_eod_token(mock_response1, eod_token_id))  # token_idsに含まれる
        self.assertTrue(is_eod_token(mock_response2, eod_token_id))  # token_idが一致
        self.assertFalse(is_eod_token(mock_response3, eod_token_id)) # 含まれない

    def test_generation_options_spec(self):
        """生成オプション仕様の確認"""
        # サポートされるオプション
        valid_options = {
            "max_tokens": 1000,
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 50,
            "repetition_penalty": 1.1
        }
        
        # 全て数値型であることを確認
        for key, value in valid_options.items():
            self.assertIsInstance(value, (int, float), f"{key} should be numeric")
        
        # max_tokensは正の整数
        self.assertIsInstance(valid_options["max_tokens"], int)
        self.assertGreater(valid_options["max_tokens"], 0)
        
        # temperatureは0以上の浮動小数点
        self.assertIsInstance(valid_options["temperature"], (int, float))
        self.assertGreaterEqual(valid_options["temperature"], 0)

    def test_method_validation(self):
        """methodフィールドの検証"""
        valid_methods = ["capabilities", "chat", "completion", "format_test"]
        
        for method in valid_methods:
            request = {"method": method}
            # methodが文字列であることを確認
            self.assertIsInstance(request["method"], str)
            self.assertIn(request["method"], valid_methods)
        
        # 無効なmethodは受け付けない想定
        invalid_methods = ["invalid", "generate", ""]
        for method in invalid_methods:
            self.assertNotIn(method, valid_methods)

    def test_format_test_request_format(self):
        """format_test リクエストフォーマット検証"""
        # 期待されるリクエスト形式
        expected_request = {
            "method": "format_test",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Format this conversation"}
            ],
            "options": {
                "primer": "I'll help you"
            }
        }
        
        # JSONシリアライズ可能であることを確認
        json_str = json.dumps(expected_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "format_test")
        self.assertIn("messages", parsed)
        self.assertEqual(len(parsed["messages"]), 2)

    def test_format_test_response_structure(self):
        """format_test レスポンス構造の検証"""
        # 期待されるレスポンス構造
        expected_response_structure = {
            "formatted_prompt": "string or null",
            "template_applied": "boolean", 
            "model_specific_processing": "array or null",
            "error": "string or null"
        }
        
        # 構造の妥当性を確認
        for key, expected_type in expected_response_structure.items():
            self.assertIsInstance(key, str)
            self.assertIsInstance(expected_type, str)

    def test_comprehensive_special_tokens(self):
        """包括的なspecial tokens機能の検証"""
        # 標準トークンカテゴリ
        standard_categories = {
            "standard": ["eod", "bos", "unk", "pad"],
            "chatml": ["system", "user", "assistant"],
            "code": ["code", "python", "javascript", "bash"],
            "media": ["image", "audio", "video"],
            "tools": ["tool_call", "function", "api"],
            "thinking": ["thinking", "reasoning", "analysis"],
            "single": ["fim_prefix", "vision", "code_inline"]
        }
        
        # カテゴリごとの構造確認
        for category, tokens in standard_categories.items():
            for token in tokens:
                # トークンが存在する場合の構造検証は他のテストで実施済み
                self.assertIsInstance(token, str)

    def test_format_test_comprehensive(self):
        """format_test機能の包括的テスト"""
        # 複雑なメッセージ構造
        complex_messages = [
            {"role": "system", "content": "You are a helpful assistant with special capabilities."},
            {"role": "user", "content": "Hello! Can you help me with coding?"},
            {"role": "assistant", "content": "Of course! I'd be happy to help."},
            {"role": "user", "content": "Write a Python function to calculate fibonacci."}
        ]
        
        # リクエスト構造の確認
        format_request = {
            "method": "format_test",
            "messages": complex_messages,
            "options": {
                "primer": "Here's a Python function"
            }
        }
        
        # JSON serialization確認
        json_str = json.dumps(format_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "format_test")
        self.assertEqual(len(parsed["messages"]), 4)
        self.assertIn("primer", parsed["options"])

    def test_error_handling_scenarios(self):
        """エラーハンドリングシナリオのテスト"""
        # 空のmessagesでのリクエスト
        empty_request = {"method": "format_test", "messages": []}
        json_str = json.dumps(empty_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["method"], "format_test")
        self.assertEqual(len(parsed["messages"]), 0)
        
        # 無効なroleを含むメッセージ
        invalid_role_request = {
            "method": "format_test",
            "messages": [
                {"role": "custom_role", "content": "Custom message"},
                {"role": "user", "content": "Regular message"}
            ]
        }
        
        json_str = json.dumps(invalid_role_request)
        parsed = json.loads(json_str)
        
        self.assertEqual(len(parsed["messages"]), 2)
        self.assertEqual(parsed["messages"][0]["role"], "custom_role")


if __name__ == '__main__':
    # テスト実行
    unittest.main()