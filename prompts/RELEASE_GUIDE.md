# リリースガイド

このドキュメントは、`@modular-prompt`パッケージ群のリリース手順とバージョン管理方法を定義します。

## 自動リリースフロー概要

プロジェクトは完全自動化されたリリースフローを採用しています。

### ワークフロー

1. **version-update.yml** - `release/*`ブランチへのpush時に実行
   - changesetを適用してパッケージバージョン更新
   - CHANGELOGを自動生成
   - ルートpackage.jsonのバージョン更新
   - mainへのPRを自動作成

2. **release.yml** - release/*ブランチからのPRマージ時に実行
   - テスト・ビルド・型チェック・lint実行
   - **Gitタグを自動作成**
   - GitHubリリースを自動作成
   - npmへの自動公開（Trusted Publisher使用）

## リリース手順

### 1. changesetファイルの作成

変更内容を記録します：

```bash
# changesetファイルを作成
npx changeset

# 対話形式で以下を選択：
# - 変更のあったパッケージを選択
# - 変更の種類を選択（patch/minor/major）
# - 変更内容の説明を入力
```

changesetファイルは`.changeset/`ディレクトリに作成されます。

### 2. リリースブランチの作成

```bash
# リリースブランチを作成（ブランチ名でバージョンを指定）
git checkout -b release/0.5.0  # または release/v0.5.0（どちらでも可）

# changesetファイルをコミット
git add .changeset/
git commit -m "chore: add changeset for v0.5.0"

# リリースブランチをpush
git push -u origin release/0.5.0
```

**重要**: ブランチ名`release/X.Y.Z`のバージョン番号が、ルートpackage.jsonのバージョンになります。

### 3. CIによる自動処理

`release/*`ブランチへのpush後、**version-update.yml**が自動実行されます：

1. ✅ changesetを適用してパッケージバージョン更新
2. ✅ CHANGELOGを自動生成
3. ✅ ルートpackage.jsonをブランチ名のバージョンに更新
4. ✅ 変更をコミット・push
5. ✅ mainへのPRを自動作成

### 4. PRのレビューとマージ

自動作成されたPRを確認します：

```bash
# PRを確認
gh pr view <PR番号>

# 確認項目：
# - [ ] CHANGELOGの内容が正しい
# - [ ] バージョン番号が正しい
# - [ ] CIテストがパスしている
```

問題がなければ、PRをマージします：

```bash
gh pr merge <PR番号> --squash  # または GitHub UIでマージ
```

### 5. リリースの自動実行

PRマージ後、**release.yml**が自動実行されます：

1. ✅ テスト・ビルド・型チェック・lint実行
2. ✅ Gitタグ`vX.Y.Z`を自動作成・push
3. ✅ GitHubリリースを自動作成
4. ✅ 変更されたパッケージをnpmに自動公開

**すべて自動実行されるため、手動作業は不要です。**

### 6. リリース完了の確認

```bash
# GitHubリリースを確認
gh release view vX.Y.Z

# npmへの公開を確認
npm view @modular-prompt/core version
npm view @modular-prompt/driver version
```

## バージョン管理

### セマンティックバージョニング

すべてのパッケージは[セマンティックバージョニング](https://semver.org/lang/ja/)に従います：

- **MAJOR** (x.0.0): 破壊的変更
- **MINOR** (0.x.0): 後方互換性のある機能追加
- **PATCH** (0.0.x): 後方互換性のあるバグ修正

### changesetによる管理

changesetツールが各パッケージのバージョンを自動管理します：

- **patch**: バグ修正、軽微な改善
- **minor**: 新機能追加（後方互換）
- **major**: 破壊的変更

## 初回公開時の設定

### npm Trusted Publisher設定（必須）

新しい組織への初回公開時は、**手動公開**または**Trusted Publisher設定**が必要です。

#### 方法1: 初回手動公開（推奨）

```bash
# npmにログイン
npm login

# 各パッケージを手動公開
cd packages/core && npm publish --access public
cd ../driver && npm publish --access public
cd ../utils && npm publish --access public
cd ../process && npm publish --access public
cd ../simple-chat && npm publish --access public
cd ../experiment && npm publish --access public
```

#### 方法2: Trusted Publisher事前設定

[npmjs.com](https://www.npmjs.com/)で各パッケージのTrusted Publisherを事前設定：

1. npmjs.comでパッケージを作成（空でOK）
2. Settings > Publishing access > Trusted publishers
3. "Add trusted publisher"をクリック
4. 以下を入力：
   - Provider: GitHub Actions
   - Organization: `otolab`
   - Repository: `modular-prompt`
   - Workflow: `release.yml`
   - Environment: (空欄)

初回公開後は、CIが自動的にTrusted Publisherで公開します。

## トラブルシューティング

### CIでnpm公開が失敗する

**原因**: Trusted Publisherが未設定

**解決策**:
1. 上記「初回公開時の設定」を参照
2. 手動で一度公開するか、Trusted Publisherを設定

### バージョンが期待と異なる

**原因**: changesetファイルの設定が不適切、またはブランチ名のバージョンが間違っている

**確認事項**:
- `.changeset/*.md`ファイルの内容を確認
- リリースブランチ名が正しいか確認（`release/0.5.0`）
- version-update.ymlのログを確認

### PRが自動作成されない

**原因**: changesetファイルが存在しない

**解決策**:
```bash
# changesetファイルの存在確認
ls -la .changeset/*.md | grep -v README.md

# なければ作成
npx changeset
```

## リリースタイプ別の例

### パッチリリース（バグ修正）

```bash
# changesetを作成
npx changeset
# → patchを選択、変更内容を記述

# リリースブランチ作成・push
git checkout -b release/0.5.1
git add .changeset/
git commit -m "chore: add changeset for v0.5.1"
git push -u origin release/0.5.1

# → CIが自動でPR作成
# → PRマージ後、自動でリリース
```

### マイナーリリース（新機能）

```bash
# changesetを作成
npx changeset
# → minorを選択、新機能の説明を記述

# リリースブランチ作成・push
git checkout -b release/0.6.0
git add .changeset/
git commit -m "chore: add changeset for v0.6.0"
git push -u origin release/0.6.0

# → CIが自動でPR作成
# → PRマージ後、自動でリリース
```

### メジャーリリース（破壊的変更）

```bash
# changesetを作成
npx changeset
# → majorを選択、破壊的変更の詳細を記述

# マイグレーションガイド作成（必要に応じて）
# docs/MIGRATION.md

# リリースブランチ作成・push
git checkout -b release/1.0.0
git add .changeset/ docs/MIGRATION.md
git commit -m "chore: add changeset for v1.0.0"
git push -u origin release/1.0.0

# → CIが自動でPR作成
# → PRマージ後、自動でリリース
```

## プレリリース

### アルファ版

```bash
# changesetでprereleaseを作成
npx changeset pre enter alpha

# changesetを作成
npx changeset

# リリースブランチ作成
git checkout -b release/0.6.0-alpha.1
git add .
git commit -m "chore: prepare alpha release"
git push -u origin release/0.6.0-alpha.1

# プレリリースモード終了
npx changeset pre exit
```

## 緊急修正（ホットフィックス）

```bash
# 最新のmainから分岐
git checkout main
git pull origin main

# changesetを作成
npx changeset
# → patchを選択

# リリースブランチ作成
git checkout -b release/0.5.1
git add .changeset/
git commit -m "chore: hotfix for critical bug"
git push -u origin release/0.5.1

# → 通常のリリースフローで自動実行
```

## リリース前チェックリスト

- [ ] changesetファイルが作成されている
- [ ] リリースブランチ名が正しい（`release/X.Y.Z`）
- [ ] ローカルでテストがパスする
- [ ] 破壊的変更がある場合、マイグレーションガイドを作成
- [ ] CHANGELOGの内容が適切（PR作成後に確認）

## リリース後チェックリスト

- [ ] GitHubリリースが作成されている
- [ ] npmに公開されている（`npm view`で確認）
- [ ] ドキュメントが最新
- [ ] 必要に応じて関係者に通知

## 関連ドキュメント

- [CHANGELOG.md](../CHANGELOG.md) - 変更履歴
- [Changesets](https://github.com/changesets/changesets) - バージョン管理ツール
- [セマンティックバージョニング](https://semver.org/lang/ja/)
- [Conventional Commits](https://www.conventionalcommits.org/ja/)
