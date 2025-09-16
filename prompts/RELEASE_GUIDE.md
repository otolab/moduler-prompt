# リリースガイド

このドキュメントは、`@moduler-prompt`パッケージ群のリリース手順とバージョン管理方法を定義する。

## バージョン管理方針

### セマンティックバージョニング

すべてのパッケージは[セマンティックバージョニング](https://semver.org/lang/ja/)に従う：

- **MAJOR** (x.0.0): 後方互換性を破る変更
- **MINOR** (0.x.0): 後方互換性を保ちつつ機能追加
- **PATCH** (0.0.x): 後方互換性を保つバグ修正

### バージョン同期戦略

#### モノレポ全体のバージョン管理
- ルートの`package.json`でプロジェクト全体のバージョンを管理
- 個別パッケージは独立したバージョンを持つことも可能

#### パッケージ間の依存関係
- 同一モノレポ内のパッケージ間依存は具体的なバージョンを指定（例：`"^0.1.1"`）
- バージョン更新時は依存関係も合わせて更新する必要がある

## リリースタイプ

### 1. パッチリリース (例: 0.1.0 → 0.1.1)

バグ修正、ドキュメント更新、軽微な改善。

```bash
# 1. リリースブランチ作成
git checkout -b release/v0.1.1

# 2. バージョン更新
npm version patch --no-git-tag-version
# または個別パッケージ: npm version patch -w @moduler-prompt/core --no-git-tag-version

# 3. 変更をコミット
git add .
git commit -m "chore: バージョンを0.1.1に更新"

# 4. PR作成
git push -u origin release/v0.1.1
gh pr create --title "chore: v0.1.1リリース" --body "..."
```

### 2. マイナーリリース (例: 0.1.0 → 0.2.0)

新機能追加、大きな改善（後方互換性維持）。

```bash
# 1. リリースブランチ作成
git checkout -b release/v0.2.0

# 2. バージョン更新
npm version minor --no-git-tag-version

# 3. CHANGELOG.md更新
# 新機能の詳細を記載

# 4. コミット＆PR作成
git add .
git commit -m "chore: バージョンを0.2.0に更新"
git push -u origin release/v0.2.0
gh pr create --title "feat: v0.2.0リリース" --body "..."
```

### 3. メジャーリリース (例: 0.1.0 → 1.0.0)

破壊的変更、APIの大幅な変更。

```bash
# 1. リリースブランチ作成
git checkout -b release/v1.0.0

# 2. バージョン更新
npm version major --no-git-tag-version

# 3. マイグレーションガイド作成
# docs/MIGRATION.mdに移行手順を記載

# 4. CHANGELOG.md更新
# 破壊的変更を明記

# 5. コミット＆PR作成
git add .
git commit -m "chore!: v1.0.0リリース"
git push -u origin release/v1.0.0
gh pr create --title "chore!: v1.0.0リリース" --body "..."
```

## リリースフロー

### 1. 準備フェーズ

```bash
# テスト実行
npm test

# ビルド確認
npm run build

# 型チェック
npm run typecheck

# Lint実行
npm run lint
```

### 2. バージョン更新

```bash
# ルートパッケージのバージョン更新
npm version <patch|minor|major> --no-git-tag-version

# 個別パッケージのバージョン更新（必要に応じて）
npm version <patch|minor|major> -w @moduler-prompt/core --no-git-tag-version
npm version <patch|minor|major> -w @moduler-prompt/driver --no-git-tag-version
npm version <patch|minor|major> -w @moduler-prompt/utils --no-git-tag-version
npm version <patch|minor|major> -w @moduler-prompt/process --no-git-tag-version
```

### 3. CHANGELOG更新

`CHANGELOG.md`に変更内容を記載：

```markdown
## [0.1.1] - 2025-01-16

### Fixed
- バグ修正の内容

### Added
- 新機能の内容

### Changed
- 変更内容

### Deprecated
- 非推奨となった機能

### Removed
- 削除された機能

### Security
- セキュリティ修正
```

### 4. PR作成とレビュー

```bash
# PRの作成
gh pr create \
  --title "chore: v0.1.1リリース" \
  --body "リリース内容を記載"

# レビュー依頼
# マージ前に必ず以下を確認：
# - [ ] テストがパス
# - [ ] ビルドが成功
# - [ ] CHANGELOGが更新済み
# - [ ] バージョン番号が正しい
```

### 5. マージとタグ付け

```bash
# mainブランチにマージ後
git checkout main
git pull origin main

# タグを作成
git tag v0.1.1
git push origin v0.1.1

# GitHubリリース作成
gh release create v0.1.1 \
  --title "v0.1.1" \
  --notes "CHANGELOGの内容をコピー"
```

### 6. npm公開

```bash
# npm公開（初回はログインが必要）
npm login

# 個別パッケージの公開
npm publish -w @moduler-prompt/core
npm publish -w @moduler-prompt/driver
npm publish -w @moduler-prompt/utils
npm publish -w @moduler-prompt/process

# または一括公開（設定済みの場合）
npm publish --workspaces
```

## プレリリース

### アルファ版

```bash
# バージョン例: 0.2.0-alpha.1
npm version prerelease --preid=alpha --no-git-tag-version

# npm公開（alphaタグ付き）
npm publish --tag alpha -w @moduler-prompt/core
```

### ベータ版

```bash
# バージョン例: 0.2.0-beta.1
npm version prerelease --preid=beta --no-git-tag-version

# npm公開（betaタグ付き）
npm publish --tag beta -w @moduler-prompt/core
```

## 緊急修正（ホットフィックス）

本番環境の緊急修正が必要な場合：

```bash
# 1. 最新のタグから分岐
git checkout v0.1.0
git checkout -b hotfix/v0.1.1

# 2. 修正を実施
# ...

# 3. バージョン更新
npm version patch --no-git-tag-version

# 4. PR作成（mainへ）
git push -u origin hotfix/v0.1.1
gh pr create --base main --title "hotfix: 緊急修正" --body "..."

# 5. マージ後、即座にリリース
```

## チェックリスト

### リリース前チェック

- [ ] すべてのテストがパス
- [ ] ビルドが成功
- [ ] 型チェックが通る
- [ ] Lintエラーがない
- [ ] CHANGELOGが更新済み
- [ ] ドキュメントが最新
- [ ] 破壊的変更の場合、マイグレーションガイドあり
- [ ] package.jsonのバージョンが正しい
- [ ] 依存関係が最新

### リリース後チェック

- [ ] GitHubにタグが作成されている
- [ ] GitHubリリースが作成されている
- [ ] npmに公開されている
- [ ] ドキュメントサイトが更新されている（該当する場合）
- [ ] 関係者に通知済み

## トラブルシューティング

### npm公開エラー

```bash
# 認証エラーの場合
npm logout
npm login

# 権限エラーの場合
npm access ls-packages
npm access grant read-write <org>:<team> @moduler-prompt/core

# バージョン重複エラーの場合
npm view @moduler-prompt/core versions --json
```

### workspace参照の解決

```bash
# workspace:*を具体的なバージョンに変換
npm pack --dry-run -w @moduler-prompt/core
```

## 自動化スクリプト

リリース作業を簡略化するスクリプト例：

```bash
#!/bin/bash
# scripts/release.sh

VERSION_TYPE=$1  # patch, minor, major

if [ -z "$VERSION_TYPE" ]; then
  echo "Usage: ./scripts/release.sh <patch|minor|major>"
  exit 1
fi

# テスト実行
npm test || exit 1

# ビルド
npm run build || exit 1

# バージョン更新
npm version $VERSION_TYPE --no-git-tag-version

# 新バージョン取得
NEW_VERSION=$(node -p "require('./package.json').version")

# ブランチ作成
git checkout -b release/v$NEW_VERSION

# コミット
git add .
git commit -m "chore: バージョンを$NEW_VERSIONに更新"

# プッシュ
git push -u origin release/v$NEW_VERSION

echo "リリースブランチ release/v$NEW_VERSION を作成しました"
echo "PRを作成してレビューを依頼してください"
```

## 関連ドキュメント

- [CHANGELOG.md](../CHANGELOG.md) - 変更履歴
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢献ガイド
- [セマンティックバージョニング](https://semver.org/lang/ja/)
- [Conventional Commits](https://www.conventionalcommits.org/ja/)