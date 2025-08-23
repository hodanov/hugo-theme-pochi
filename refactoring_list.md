# Refactoring List (Pochi Theme)

このドキュメントは、Hugo テーマ Pochi のリファクタ候補（問題点）を整理したものだよ。小さく安全に直せる順に進めていこう。

## Templates

- 基本構造の混在: `layouts/_default/baseof.html` 末尾で `{{ define "main" }}` を定義し、`list.html`/`single.html` でも `main` を定義。`baseof.html` は骨組み専用にして、各ページで完全上書きに統一すると読みやすい。
- メニュー URL の相対性: `partials/molecules/nav.html` で `.URL` を直出し。`relURL`/`absURL` を通してサブディレクトリ配備でも壊れないように。
- 責務分離: `partials/head/preload_featured_image.html` が重めの画像処理ロジックを持つ。画像変換方針は `partials/atoms/picture.html` に寄せ、head は最小限に。

## Head / SEO

- `<title>` と description の拡張性: いまでも動くが、`block` 化や i18n キー化で拡張しやすく。

## Assets Pipeline

- Sass の `@import` 依存: 段階的に `@use`/`@forward` へ移行して依存順とスコープを明確化。
- ソースマップなし: 開発は非圧縮＋ソースマップ、本番は `Minify+fingerprint` に分岐できる仕組みを。
- アイコンの一括インライン: `partials/molecules/icons.html` が `icons/*.svg` を全てインライン。未使用分まで読まないよう、使用箇所だけをインラインする仕組みに検討余地。

## SCSS / CSS

- 文字間隔の過度な全体適用: `body { letter-spacing: 2px; }` は可読性低下を招きやすい。本文限定 or 日本語限定、あるいはトークン化して文脈別に。
- ダークモードの整合: `:root.dark` の上書きと既存色の整合がまだら。コントラスト比と色源泉（CSS変数/SCSS変数）の一本化を。

## JavaScript

- 同期 XHR の使用: `urlExists()` が同期 HEAD リクエスト。非同期化 or テンプレ側でフォールバック URL を決定する設計へ。

## アクセシビリティ / 国際化

- ラベルとコントラスト: 検索フォームはラベルありで良いが、ダーク/ライト両方で hover/focus のコントラスト再確認。
- i18n 抽出: 固定文言（Search, Loading... など）を `i18n` ディレクトリへ移し翻訳可能に。

## パフォーマンス

- 画像プリロードの過剰生成懸念: `preload_featured_image.html` が多サイズ生成・srcset 構築。LCP 対象 1 枚のみに限定し、幅候補を絞ってビルド負荷を最適化。
- CSS の分割読み込み: `reboot.scss` + `main.scss` を常時読込。ページタイプ別のクリティカル CSS 分割を検討（やりすぎ注意）。

## 設定 / 運用

- `npm scripts`/CI のモード分離: `serve`/`build` でソースマップや minify の有無をスイッチできるように。`format:check` を CI へ。
- サブパス配備の検証: `example_site` の `baseURL` をサブディレクトリに設定して動作確認する手順をドキュメント化。
