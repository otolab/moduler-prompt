---
"@moduler-prompt/driver": patch
"@moduler-prompt/simple-chat": patch
---

package.jsonにrepositoryフィールドを追加

Trusted Publisher使用時の--provenanceフラグがrepository.urlを検証するため、
driverとsimple-chatパッケージにrepositoryフィールドを追加しました。
