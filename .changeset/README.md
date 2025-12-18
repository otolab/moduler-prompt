# Changesets

このディレクトリには、次回リリースで反映される変更内容を記述したchangesetファイルが格納されます。

## Changesetの作成

パッケージに変更を加えた場合、changesetを作成してください：

```bash
npx changeset
```

対話的に以下を選択します：
1. 変更したパッケージ
2. バージョンアップの種類（major/minor/patch）
3. 変更内容の説明

## リリースフロー

1. `release/x.x.x` ブランチを作成
2. GitHub Actions が自動的にバージョン更新とCHANGELOG生成
3. PRを確認してmainにマージ
4. マージ時に自動的にnpmへ公開

詳細は `/docs/RELEASE.md` を参照してください。
