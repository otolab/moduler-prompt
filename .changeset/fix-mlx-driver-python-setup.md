---
"@moduler-prompt/driver": patch
---

MLXドライバーのPython環境セットアップを修正

- Python 3.13に固定（.python-version、setup-mlx.js、pyproject.toml）
- 不要なtest_*.pyファイルを削除
- pyproject.tomlにpy-modulesを明示的に指定してsetuptools discovery問題を解決
