# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-09-10

### Fixed
- **Driver Package**
  - npmパッケージの内容を修正（不要なファイル除外）

## [0.1.1] - 2025-09-10

### Added
- **Driver Package**
  - postinstallスクリプトによるMLXドライバーの自動セットアップ
  - setup-mlxコマンドで手動セットアップ可能
  - uvパッケージマネージャーの自動インストール

### Fixed
- **All Packages**
  - npmパッケージにsrcディレクトリが含まれる問題を修正
  - distディレクトリのみを含むように修正
  - Python仮想環境（.venv）をignoreに追加

## [0.1.0] - 2025-09-10

### Added
- 初回リリース
- **Core Package (@moduler-prompt/core)**
  - PromptModule型定義システム
  - モジュールのmerge機能
  - compile関数による構造化プロンプト生成
  - DynamicContent による動的コンテンツ生成
  - inputs標準セクション（シンプルな入力データ用）
  - 包括的な型定義（Element、SectionContent等）

- **Driver Package (@moduler-prompt/driver)**
  - OpenAI GPT-4/GPT-3.5対応
  - Anthropic Claude対応
  - Google Vertex AI (Gemini)対応
  - Ollama ローカルLLM対応
  - MLX Apple Silicon最適化ドライバー
  - TestDriver（テスト用モック）
  - EchoDriver（デバッグ用）
  - ストリーミング対応
  - ModelSpec によるモデル能力管理

- **Utils Package (@moduler-prompt/utils)**
  - DriverRegistry（ドライバー自動選択）
  - Formatter（プロンプトのテキスト変換）
  - デフォルト設定管理

- **Process Package (@moduler-prompt/process)**
  - withMaterials（資料管理モジュール）
  - streamProcess（ストリーム処理）
  - dialogue（対話処理）
  - summarize（要約処理）

- **Sample Implementation**
  - simple-chat（サンプル実装、非公開パッケージ）

- **Documentation**
  - コンセプトと設計思想
  - アーキテクチャ詳細
  - モジュール作成ガイド
  - モジュール使用ガイド
  - 動作確認手順
  - ドライバーAPI仕様

### Security
- プロンプトインジェクション対策
  - Instructions/Data/Output セクションの明確な分離
  - データ内の指示を無視する設計

### Performance
- TypeScriptによる完全な型安全性
- ストリーミング対応による大規模データ処理
- コンテキスト再利用による効率化

## [Unreleased]
### Planned
- 追加のAIモデル対応
- パフォーマンス最適化
- より高度な処理パターン