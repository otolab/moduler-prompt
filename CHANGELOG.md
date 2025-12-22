# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2025-12-22

### Added
- **Experiment Package (@modular-prompt/experiment@0.1.0)**
  - 初回リリース: プロンプトモジュールの比較・評価フレームワーク
  - 複数のプロンプトモジュールを同一条件で比較実行
  - コードベースおよびAI評価の両方をサポート
  - YAML/TypeScript設定ファイル対応（jitiで自動トランスパイル）
  - CLIコマンド: `modular-experiment <config>`

### Fixed
- **Driver Package (@modular-prompt/driver@0.4.5)**
  - MLXドライバーのPython環境セットアップを修正
  - Python 3.13に固定（.python-version、setup-mlx.js、pyproject.toml）
  - 不要なtest_*.pyファイルを削除
  - pyproject.tomlにpy-modulesを明示的に指定

### Changed
- **Breaking Change: プロジェクト名変更**
  - `@moduler-prompt/*` → `@modular-prompt/*` (タイポ修正)
  - npm organization: https://www.npmjs.com/org/modular-prompt
  - CLIコマンド: `moduler-experiment` → `modular-experiment`

## [0.4.0] - 2025-01-18

### Added
- **Driver Package (@modular-prompt/driver@0.4.0)**
  - GoogleGenAI driver for Gemini API support via @google/genai SDK
  - Direct access to Gemini models using API key authentication
  - Native structured output support with JSON schema
  - Streaming response support with AsyncIterable pattern
  - Support for gemini-2.0-flash-exp and gemini-2.5-flash-lite models
  - Config file and environment variable (GOOGLE_GENAI_API_KEY) authentication

## [0.2.8] - 2025-11-25

### Fixed
- **Driver Package (@modular-prompt/driver@0.2.8)**
  - chat_template_constraints.pyのmax_system_messages検出ロジックを修正
  - systemロールが完全にサポートされていないモデル（gemma-2-2b-it-4bitなど）で誤って `max_system_messages = 1` を返していた問題を修正
  - 単独systemメッセージのテスト結果も考慮するように変更
    - 単独systemでエラー → `max_system_messages = 0`（systemロール禁止）
    - 複数でエラー、単独で成功 → `max_system_messages = 1`（最大1つ）
    - 両方成功 → キーを設定しない（無制限）

## [0.2.6] - 2025-01-21

### Fixed
- **Driver Package (@modular-prompt/driver@0.2.6)**
  - ModelSpecのカスタム設定がプリセットで上書きされる問題を修正（Issue #29）
  - `apiStrategy: 'force-completion'`などのカスタム設定が正しく優先されるように修正
  - `chatRestrictions: undefined`でプリセット制限をクリアできるように修正
  - マージ戦略を明確化：パラメータごとに異なるマージ深さを使用
    - apiStrategy: SHALLOW MERGE（完全置換）
    - capabilities: DEEP MERGE（プロパティごとにマージ）
    - chatRestrictions: SHALLOW MERGE with undefined support（完全置換またはクリア）
    - customProcessor: SHALLOW MERGE（優先度チェーン）
  - `getPresetSpec()`関数を追加（`mergeWithPreset()`は非推奨だが後方互換性のため残存）
  - テストケースを追加してカスタム設定の優先順位を保証

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
- **Core Package (@modular-prompt/core)**
  - PromptModule型定義システム
  - モジュールのmerge機能
  - compile関数による構造化プロンプト生成
  - DynamicContent による動的コンテンツ生成
  - inputs標準セクション（シンプルな入力データ用）
  - 包括的な型定義（Element、SectionContent等）

- **Driver Package (@modular-prompt/driver)**
  - OpenAI GPT-4/GPT-3.5対応
  - Anthropic Claude対応
  - Google Vertex AI (Gemini)対応
  - Ollama ローカルLLM対応
  - MLX Apple Silicon最適化ドライバー
  - TestDriver（テスト用モック）
  - EchoDriver（デバッグ用）
  - ストリーミング対応
  - ModelSpec によるモデル能力管理

- **Utils Package (@modular-prompt/utils)**
  - DriverRegistry（ドライバー自動選択）
  - Formatter（プロンプトのテキスト変換）
  - デフォルト設定管理

- **Process Package (@modular-prompt/process)**
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