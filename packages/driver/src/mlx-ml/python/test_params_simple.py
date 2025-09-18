#!/usr/bin/env python
"""
stream_generateがtemperatureパラメータを受け付けるかの簡単なテスト
"""

import inspect
from mlx_lm import stream_generate

# stream_generateのシグネチャを確認
sig = inspect.signature(stream_generate)
print("stream_generate signature:")
print(sig)

# **kwargsがあることを確認
if 'kwargs' in str(sig):
    print("\n✓ stream_generate accepts **kwargs")
    print("  This means it can accept temperature and other parameters")
else:
    print("\n✗ stream_generate does not accept **kwargs")

# 実際にどのようなパラメータが使われるか、ドキュメントを確認
if stream_generate.__doc__:
    print("\n--- Documentation ---")
    doc_lines = stream_generate.__doc__.split('\n')[:20]  # 最初の20行
    for line in doc_lines:
        print(line)
