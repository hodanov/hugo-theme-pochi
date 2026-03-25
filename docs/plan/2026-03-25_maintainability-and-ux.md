# Plan: like/share ボタン i18n 対応と nav の float → flexbox 移行

ハードコードされた日本語文字列を i18n 化し、nav の float レイアウトを flexbox に置き換えて保守性と堅牢性を向上させる。

## Background

- フェーズ 1（WCAG/HTML 修正）、フェーズ 2（セキュリティ・パフォーマンス）に続くフェーズ 3
- like/share ボタンの `title` 属性と JS のフィードバックテキスト、CSS の `::after content` が日本語でハードコードされており、英語ページでも日本語が表示される
- nav が float ベースのレイアウトで、clearfix 問題や垂直方向の揃えが困難
- article-list の float は、テキストが画像の下に回り込む動作が必要なため維持する

## Current structure

### i18n 関連

- `layouts/partials/molecules/like_button.html:8` — `title="いいね"` ハードコード
- `layouts/partials/molecules/share_button.html:6` — `title="URLをコピー"` ハードコード
- `assets/js/share-button.js:75` — `"URLをコピーしました"` ハードコード
- `assets/js/share-button.js:84` — `"コピーに失敗しました"` ハードコード
- `assets/css/components/sidebar.css:172` — `#action-bar-mobile .share-btn[aria-pressed="true"]::after { content: "URLをコピーしました" }`
- `assets/css/components/sidebar.css:273` — `#sidebar-left .share-btn[aria-pressed="true"]::after { content: "URLをコピーしました" }`
- `i18n/ja.toml`, `i18n/en.toml` — `like`, `copy_url`, `url_copied`, `copy_failed` キーが存在しない

### float レイアウト関連（nav のみ対象）

- `assets/css/components/nav.css:36-37` — `#menu-bar-btn { float: left; }`
- `assets/css/components/nav.css:62-64` — `#theme-toggle-switch-container, #lang-switcher-container { float: right; }`
- `assets/css/components/nav.css:126-128` — `.menu-global-nav-container { float: right; }`
- `assets/css/components/nav.css:136-137` — `nav.site-nav ul li { float: left; }`

## Design policy

- CSS の `content` プロパティで i18n する場合は `attr(data-*)` 方式を採用する。Hugo テンプレートで `data-*` 属性にテキストを渡し、CSS 側で `content: attr(data-feedback-text)` で取得する
- JS のハードコード文字列は、HTML の `data-*` 属性から読み取る方式に変更する。JS ファイル内に自然言語文字列を持たない
- float → flexbox 移行は nav のみ対象とし、既存のレスポンシブブレークポイント（768px）を維持する
- article-list の float は、テキストが画像の下に回り込む動作（float の特性）が必要なため維持する。grid/flexbox ではこの挙動を再現できない
- nav の flexbox 化では、デスクトップ: ロゴ左 + メニュー右 + ユーティリティ右、モバイル: ハンバーガー左 + ロゴ中央 + テーマ切替右 のレイアウトを維持する
- nav の flexbox 化では `order` プロパティで HTML 順序と視覚的順序を分離し、デスクトップではロゴを `position: static` にして flex フローに参加させる

## Implementation steps

### Part A: like/share ボタン i18n

1. **i18n キー追加** — `ja.toml` と `en.toml` に `like`, `copy_url`, `url_copied`, `copy_failed` キーを追加する
2. **like_button.html 修正** — `title="いいね"` を `title="{{ T "like" }}"` に変更する
3. **share_button.html 修正** — `title="URLをコピー"` を `title="{{ T "copy_url" }}"` に変更する。`data-feedback-copied="{{ T "url_copied" }}"` と `data-feedback-failed="{{ T "copy_failed" }}"` 属性を追加する
4. **share-button.js 修正** — ハードコード文字列を `data-*` 属性から読み取るように変更する
   - `"URLをコピーしました"` → `btn.dataset.feedbackCopied`
   - `"コピーに失敗しました"` → `btn.dataset.feedbackFailed`
5. **sidebar.css のツールチップ修正** — `content: "URLをコピーしました"` を `content: attr(data-feedback-copied)` に変更する（`::after` の `content` で `attr()` が使える）
6. **テスト修正** — `tests/e2e/f-09-share-button.spec.js:24` のハードコード文字列を更新する

### ~~Part B: article-list の float → grid 移行~~ (見送り)

テキストが画像の下に回り込む float 特有の動作が必要なため、grid/flexbox への移行は見送り。float を維持する。

### Part C: nav の float → flexbox 移行

1. **`.nav-wrapper` を flexbox 化** — `display: flex; align-items: center;` を適用する
2. **float 宣言を削除** — `#menu-bar-btn { float: left; }`, `#theme-toggle-switch-container, #lang-switcher-container { float: right; }`, `.menu-global-nav-container { float: right; }`, `nav.site-nav ul li { float: left; }` の各 float を削除する
3. **メニュー項目を flexbox 化** — `nav.site-nav ul` に `display: flex; align-items: center;` を適用し、`li { float: left; }` を削除する
4. **`order` で視覚的順序を制御** — `.menu-global-nav-container` に `order: 1; margin-left: auto`、`#lang-switcher-container` に `order: 2`、`#theme-toggle-switch-container` に `order: 3` を設定し、HTML 順序（logo → lang → theme → menu-btn → menu）と視覚的順序（logo → menu → lang → theme）を分離する
5. **デスクトップでロゴを flex フローに参加** — `@media (min-width: 768px)` でロゴの `position: absolute` を `position: static` に上書きし、flex アイテムとして配置する。モバイルでは `position: absolute` + `left: 50%; transform: translateX(-50%)` による中央寄せを維持する
6. **モバイルレイアウト調整** — `#menu-bar-btn` に `order: -1` で先頭配置、`#theme-toggle-switch-container` に `margin-left: auto` で右寄せ
7. **ドロップダウンリスト修正** — `nav.site-nav ul` の `display: flex` が `.dropdown-list` にも継承されるため、`.dropdown-list` に `flex-direction: column; align-items: stretch` を追加して縦並びを維持する

## File changes

| File                                             | Change                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18n/ja.toml`                                   | `like`, `copy_url`, `url_copied`, `copy_failed` キーを追加                                                                                              |
| `i18n/en.toml`                                   | `like`, `copy_url`, `url_copied`, `copy_failed` キーを追加                                                                                              |
| `layouts/partials/molecules/like_button.html:8`  | `title="いいね"` → `title="{{ T "like" }}"`                                                                                                             |
| `layouts/partials/molecules/share_button.html:6` | `title="URLをコピー"` → `title="{{ T "copy_url" }}"`。`data-feedback-copied` / `data-feedback-failed` 属性を追加                                        |
| `assets/js/share-button.js:75,84`                | ハードコード文字列を `btn.dataset.*` からの読み取りに変更                                                                                               |
| `assets/css/components/sidebar.css:172,273`      | `content: "URLをコピーしました"` → `content: attr(data-feedback-copied)`                                                                                |
| `assets/css/components/nav.css`                  | `.nav-wrapper` に `display: flex; align-items: center;` を追加                                                                                          |
| `assets/css/components/nav.css`                  | `#menu-bar-btn`, `#theme-toggle-switch-container`, `#lang-switcher-container`, `.menu-global-nav-container`, `nav.site-nav ul li` の各 `float` を削除   |
| `assets/css/components/nav.css`                  | `.menu-global-nav-container` に `order: 1; margin-left: auto`、`#lang-switcher-container` に `order: 2`、`#theme-toggle-switch-container` に `order: 3` |
| `assets/css/components/nav.css`                  | `nav.site-nav ul` に `display: flex; align-items: center;` を追加                                                                                       |
| `assets/css/components/nav.css`                  | デスクトップでロゴを `position: static` に上書き                                                                                                        |
| `assets/css/components/nav.css`                  | モバイルで `#menu-bar-btn` に `order: -1`、`#theme-toggle-switch-container` に `margin-left: auto`                                                      |
| `assets/css/components/nav.css`                  | `.dropdown-list` に `flex-direction: column; align-items: stretch` を追加                                                                               |
| `tests/e2e/f-09-share-button.spec.js:24`         | ハードコード文字列をデータ属性ベースの検証に更新                                                                                                        |

## Risks and mitigations

| Risk                                                                                                | Mitigation                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS `content: attr()` がツールチップ表示位置やスタイルを変える                                      | `attr()` は文字列を返すだけなので既存の `::after` のスタイル（position, transform 等）はそのまま維持される                                                                |
| `data-feedback-copied` 属性が `::after` のセレクタ `[aria-pressed="true"]` と組み合わせて動作するか | `aria-pressed="true"` のときのみ `::after` が表示される既存の仕組みは変わらない。`data-*` 属性は常に存在するので問題なし                                                  |
| nav の flexbox 化でモバイルのロゴ中央寄せが崩れる                                                   | モバイルではロゴの `position: absolute` を維持し、`#menu-bar-btn` を `order: -1` で先頭、`#theme-toggle-switch-container` を `margin-left: auto` で右寄せにすることで解決 |
| nav の flexbox 化でロゴがテーマトグルに重なる                                                       | デスクトップでは `position: static` に上書きして flex フローに参加させることで解決                                                                                        |
| `nav.site-nav ul` の `display: flex` がドロップダウンリストにも継承される                           | `.dropdown-list` に `flex-direction: column; align-items: stretch` を追加して縦並びを維持                                                                                 |

## Validation

- [x] `hugo server` でビルドエラーがないことを確認
- [x] 日本語ページで like ボタンの `title` 属性が「いいね」になることを確認（ブラウザネイティブツールチップ）
- [x] 英語ページで like ボタンの `title` 属性が「Like」になることを確認（ブラウザネイティブツールチップ）
- [x] share ボタンクリック後のフィードバックテキストが言語に応じて表示されることを確認
- [x] モバイルの action-bar で share ボタンのツールチップ（`::after`）が正しく表示されることを確認
- [x] サイドバーの share ボタンのツールチップ（`::after`）が正しく表示されることを確認
- [x] デスクトップで nav のレイアウトが維持されていることを確認（ロゴ左、メニュー右、ユーティリティ右）
- [x] モバイルで nav のレイアウトが維持されていることを確認（ハンバーガー左、ロゴ中央、テーマ切替右）
- [x] ドロップダウンメニューが縦並びで表示・非表示が正常に動作することを確認
- [x] E2E テスト（全 31 テスト）が通ることを確認
- [x] `npm run lint` が通ることを確認

## Open questions

- `content: attr(data-feedback-copied)` は CSS Values Level 5 の拡張仕様（型付き attr）ではなく CSS2 の基本形式であり、全モダンブラウザで動作する。ただし IE11 では未対応だが、本テーマは IE をサポート対象外としている（フェーズ 2 で IE コメントを削除済み）ので問題ない

## Decisions

- article-list の float → grid 移行は見送り。テキストが画像の下に回り込む動作は float 固有の特性であり、grid/flexbox では再現できないため、float を維持する
