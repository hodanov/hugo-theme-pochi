# Plan: モバイル向けいいね・シェアボタン表示

いいねボタンとシェアボタンがモバイル (767px 以下) で非表示になっている問題を、画面下部の固定バー (`#action-bar-mobile`) を追加して解決する。

## Background

- 現在、いいね・シェアボタンは左サイドバー (`#sidebar-left`) 内に配置されている
- `sidebar.css` でモバイル時に `#sidebar-left { display: none }` が設定されており、ボタンごと非表示になる
- さらに `single.html` の `{{ if $hasToc }}` 条件により、TOC のない記事ではボタン自体が描画されない

## Current structure

- `layouts/posts/single.html` — ボタンの配置、`$hasToc` 条件分岐
- `layouts/partials/molecules/like_button.html` — いいねボタン partial
- `layouts/partials/molecules/share_button.html` — シェアボタン partial
- `assets/css/components/sidebar.css` — サイドバーおよびボタンのスタイル、`@media (max-width: 767px)` で `display: none`
- `assets/css/layout/grid.css` — グリッドシステム (`col-md-1`, `col-md-8`, `col-md-3`)
- `assets/js/like-button.js` — イベント委譲 (`data-like-button`) で動作、PJAX 対応済み
- `assets/js/share-button.js` — `document.addEventListener("click", onClick)` でイベント委譲済み

## Design policy

- 左サイドバーの `display: none` は解除しない（TOC レイアウトに影響するため）
- モバイル専用のフローティングバーを新設し、既存のデスクトップ用ボタンはそのまま残す
- JS の修正は不要（イベント委譲で動作するため、DOM を追加するだけでよい）
- ただし、いいねカウントの同期（片方を押したらもう片方にも反映）が必要な場合は軽微な JS 修正が発生する可能性あり

## Implementation steps

1. `layouts/posts/single.html` に `#action-bar-mobile` コンテナを追加し、`{{ if $hasToc }}` の外側でいいね・シェアボタンの partial を呼び出す
2. `assets/css/components/sidebar.css` に `#action-bar-mobile` のスタイルを追加する
   - デスクトップ: `display: none`
   - モバイル (`max-width: 767px`): `position: fixed; bottom: 0` で画面下部に固定、`display: flex` で横並び
3. `#action-bar-mobile .like-btn` / `.share-btn` 用のスタイルを追加する（サイズは既存ボタンと同等）
4. フローティングバーがコンテンツを隠さないよう、モバイル時にメインコンテンツへ `padding-bottom` を追加する
5. E2E テストにモバイルビューポートでのテストケースを追加する

## File changes

| File                                  | Change                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `layouts/posts/single.html`           | `#action-bar-mobile` コンテナ追加（`$hasToc` 条件の外）                                    |
| `assets/css/components/sidebar.css`   | `#action-bar-mobile` のレスポンシブスタイル追加、ボタンスタイル追加、`padding-bottom` 追加 |
| `tests/e2e/f-10-like-button.spec.js`  | モバイルビューポートでのテストケース追加                                                   |
| `tests/e2e/f-09-share-button.spec.js` | モバイルビューポートでのテストケース追加                                                   |

## Risks and mitigations

| Risk                                                              | Mitigation                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 同一ページにボタンが 2 セット存在し、いいねカウントが不整合になる | 両方のボタンが同一 slug を参照するため API 側は問題なし。表示カウントの同期が必要なら `like-button.js` に軽微な修正を加える |
| フローティングバーがフッターや他の要素と重なる                    | `z-index: 100` と `padding-bottom` で回避                                                                                   |
| PJAX 遷移時にモバイルバーが残る                                   | 既存の PJAX swap 処理でページ全体が入れ替わるため、自然に解消される                                                         |

## Validation

- [ ] デスクトップ (768px 以上) でフローティングバーが非表示であること
- [ ] モバイル (767px 以下) でフローティングバーが画面下部に表示されること
- [ ] モバイルでいいねボタンが動作すること（カウント反映）
- [ ] モバイルでシェアボタンが動作すること（コピー or Web Share）
- [ ] TOC のない記事でもモバイルバーが表示されること
- [ ] フローティングバーがコンテンツを隠さないこと
- [ ] E2E テストがモバイルビューポートで通ること

## Open questions

- いいねカウントの表示同期（デスクトップ用ボタンとモバイル用ボタン間）が必要か
