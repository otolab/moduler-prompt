---
"@modular-prompt/driver": minor
---

ドライバーのdefaultOptionsを動的に変更可能にするgetter/setterを追加

全てのドライバー（OpenAI、Anthropic、VertexAI、GoogleGenAI、MLX）でdefaultOptionsプロパティにgetter/setterを実装し、ドライバーインスタンス生成後に設定を動的に変更できるようにしました。これにより、ModelSpec.maxOutputTokensを使用してdefaultOptions.maxTokensを設定するなどのユースケースが可能になります。
