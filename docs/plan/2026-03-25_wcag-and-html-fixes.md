# Plan: WCAG 準拠と HTML 構造バグの修正

アクセシビリティ違反（WCAG 1.1.1, 2.4.1）と不正な HTML 構造を修正する。修正コストが低く、全ページに影響する High 優先度の 4 項目を対象とする。

## Background

- デザイン/UX 調査で High 優先度として特定された 6 件のうち、テンプレート修正のみで完結する 4 件を対象とする
- いずれも WCAG 違反または不正 HTML であり、スクリーンリーダーや検索エンジンへの影響がある
- 修正は各ファイル 1〜数行の変更で済み、副作用リスクが低い

## Current structure

- `layouts/partials/atoms/picture.html` — `alt` パラメータをそのまま `<img>` に出力する共通コンポーネント
- `layouts/partials/molecules/hero.html` — 記事ページのヒーロー画像
- `layouts/partials/molecules/post_meta_featured_image.html` — 記事ページのアイキャッチ画像
- `layouts/partials/organisms/list_of_posts.html` — 記事一覧のカード画像
- `layouts/partials/molecules/related_posts.html` — 関連記事の画像
- `layouts/_default/terms.html` — タグ/カテゴリー一覧ページ
- `layouts/partials/molecules/breadcrumbs.html` — パンくずリスト
- `layouts/partials/molecules/nav.html` — グローバルナビゲーション
- `i18n/ja.toml`, `i18n/en.toml` — 多言語キー定義

## Design policy

- `alt` テキストは記事タイトルをデフォルトとし、Front Matter の `featuredImageAlt` での上書きを可能にする
- breadcrumbs は `<nav>` + `<ol>` のセマンティック構造に変更し、JSON-LD は本フェーズでは対象外とする
- i18n キーは既存の命名規則（snake_case、`other` 形式）に合わせる
- 既存の CSS に影響を与えない範囲で HTML 構造を修正する

## Implementation steps

1. **alt テキスト修正（4 ファイル）** — `"alt" "featured image"` を `"alt" (.Params.featuredImageAlt | default .Title)` に変更する。`related_posts.html` と `list_of_posts.html` では `$page` 変数を使い `$page.Title` を参照する
2. **terms.html の HTML 構造修正** — `<ul>` を `{{ range }}` の外側に移動し、ループ内は `<li>` のみにする
3. **breadcrumbs.html のセマンティック改善** — `<div class="container-fluid">` 内の `<ul>` を `<nav aria-label="{{ T "breadcrumb" }}"><ol>` に変更する。i18n キー `breadcrumb` を追加する
4. **nav.html に aria-label 追加** — `<nav class="site-nav">` に `aria-label="{{ T "main_navigation" }}"` を追加する。i18n キー `main_navigation` を追加する
5. **i18n キー追加** — `ja.toml` と `en.toml` に `breadcrumb` と `main_navigation` のキーを追加する

## File changes

| File                                                         | Change                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `layouts/partials/molecules/hero.html:6`                     | `"alt" "featured image"` → `"alt" (.Params.featuredImageAlt \| default .Title)`                         |
| `layouts/partials/molecules/post_meta_featured_image.html:7` | `"alt" "featured image"` → `"alt" ($page.Params.featuredImageAlt \| default $page.Title)`               |
| `layouts/partials/organisms/list_of_posts.html:15`           | `"alt" "featured image"` → `"alt" ($page.Params.featuredImageAlt \| default $page.Title)`               |
| `layouts/partials/molecules/related_posts.html:19`           | `"alt" "featured image"` → `"alt" ($page.Params.featuredImageAlt \| default $page.Title)`               |
| `layouts/_default/terms.html:8-12`                           | `<ul>` を `{{ range }}` の外側に移動、ループ内は `<li>` のみ                                            |
| `layouts/partials/molecules/breadcrumbs.html:3`              | `<ul id="breadcrumbs">` → `<nav aria-label="{{ T "breadcrumb" }}"><ol id="breadcrumbs">` + 閉じタグ変更 |
| `layouts/partials/molecules/nav.html:2`                      | `<nav class="site-nav">` → `<nav class="site-nav" aria-label="{{ T "main_navigation" }}">`              |
| `i18n/ja.toml`                                               | `breadcrumb = "パンくずリスト"`, `main_navigation = "メインナビゲーション"` を追加                      |
| `i18n/en.toml`                                               | `breadcrumb = "Breadcrumb"`, `main_navigation = "Main navigation"` を追加                               |

## Risks and mitigations

| Risk                                                                | Mitigation                                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| breadcrumbs の `<ul>` → `<ol>` 変更で CSS セレクタが壊れる可能性    | `#breadcrumbs` ID セレクタで適用されている CSS を確認し、タグ依存のセレクタがないことを事前に検証する |
| `related_posts.html` のスコープ内で `.Title` が画像パス文字列を返す | `$page` 変数（14 行目で定義済み）を使い `$page.Title` で記事タイトルを取得する                        |
| `featuredImageAlt` パラメータが未設定の既存記事                     | `default .Title` でフォールバックするため影響なし                                                     |

## Validation

- [x] `hugo server` でビルドエラーがないことを確認
- [x] 記事ページのアイキャッチ画像の `alt` が記事タイトルになっていることを DevTools で確認
- [x] 記事一覧ページのカード画像の `alt` が各記事タイトルになっていることを確認
- [x] 関連記事の画像の `alt` が各記事タイトルになっていることを確認
- [x] タグ一覧ページ（`/tags/`）の HTML で `<ul>` が 1 つだけ出力されていることを確認
- [x] パンくずリストが `<nav>` で囲まれ、`aria-label` が付与されていることを確認
- [x] グローバルナビの `<nav>` に `aria-label` が付与されていることを確認
- [x] 英語ページで `aria-label` が英語で表示されることを確認
- [x] `npm run lint`（または該当する lint コマンド）が通ることを確認

## Open questions

- breadcrumbs に JSON-LD（BreadcrumbList 構造化データ）を追加するかは本フェーズでは対象外とした。SEO 効果を狙うなら別フェーズで対応する
- `breadcrumbs.html` の `<ul>` → `<ol>` 変更時に、`#breadcrumbs` に `ul` タグ依存の CSS がないか要確認
