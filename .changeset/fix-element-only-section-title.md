---
"@moduler-prompt/core": patch
---

fix: Element-only セクションで標準セクションタイトルが表示されない問題を修正

MessageElement、MaterialElement、ChunkElement などの Element のみで構成されるセクションにおいて、標準セクションタイトルを持つ SectionElement が作成されない問題を修正しました。

これにより、messages、materials、chunks などのセクションが Element のみで構成されている場合でも、正しくセクションタイトルが表示されるようになります。

また、schema セクションの JSONElement 抽出処理を改善し、JSONElement のみの場合は空の SectionElement が作成されないようにしました。
