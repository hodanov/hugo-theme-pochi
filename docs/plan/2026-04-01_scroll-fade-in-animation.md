# Plan: Scroll-triggered fade-in animation

記事カードやセクションが画面内に入ったときにフェードインするアニメーションを追加する。`IntersectionObserver` ベースで軽量に実装し、`prefers-reduced-motion` を尊重する。PJAX ナビゲーション（`pochi:afterSwap`）との統合も考慮する。

## Background

- 2025-2026 のマイクロインタラクショントレンドの王道で、サイトの体感品質を向上させる
- `docs/plan/2026-03-29_modern-blog-feature-ideas.md` の Feature idea #8 として整理済み
- pochi テーマは既に View Transitions API や scroll-to-top ボタンのフェードなどアニメーション基盤があり、パターンを踏襲できる
- CSS `transform` + `opacity` のみ使用し、レイアウトシフトやリペイントコストを抑える

## Current structure

- **JS バンドル**: `assets/js/` 配下の IIFE モジュール群を Hugo Pipes で `resources.Concat` → `resources.Minify` → `fingerprint`（`resources_js.html`）
- **CSS バンドル**: `assets/css/` 配下を同様に `resources.Concat` → `resources.Minify` → `fingerprint`（`resources_css.html`）
- **記事カード**: `layouts/partials/organisms/list_of_posts.html` の `.post-row` 要素
- **PJAX**: `navigation.js` がページ遷移をインターセプトし、`pochi:afterSwap` イベントで再初期化を通知
- **既存アニメーション**: scroll-to-top の `.fade-in` クラス、View Transitions の crossfade、画像ホバーの scale、コードコピーボタンの opacity
- **`prefers-reduced-motion`**: `view-transitions.css` と `code.css` に既存対応あり

## Design policy

- **専用パラメータで ON/OFF 制御**: `params.scrollFadeIn.enable` で機能を切り替える。`viewTransitions.enable` とは独立した設定（View Transitions はページ遷移、scroll fade-in はスクロール時で仕組みが異なるため）
- **Progressive Enhancement**: アニメーション非対応環境でもコンテンツは通常通り表示される
- **`prefers-reduced-motion` 尊重**: reduced-motion 設定時はアニメーションを無効化（即時表示）
- **パフォーマンス優先**: `transform` + `opacity` のみで GPU コンポジット対象に限定。`IntersectionObserver` で scroll イベントリスナーを回避
- **PJAX 対応**: `pochi:afterSwap` イベントで Observer を再初期化し、新しいコンテンツにもアニメーションを適用
- **既存パターン踏襲**: IIFE モジュール + `window.__pochi*` グローバルハンドル + cleanup パターン
- **対象要素は JS で付与**: テンプレートにクラスをハードコードせず、JS 側でセレクタベースに対象要素を選定する（テンプレート変更を最小化し、将来の対象追加を容易にする）
- **アニメーション対象**: 記事カード（`.post-row`）と関連記事セクション（`.related-posts .related-post-item`）
- **アニメーション値**: `translateY(20px)` / duration `0.6s` / stagger delay `100ms`（上限 5 要素 = 0.5s）

## Implementation steps

1. `baseof.html` の `<body>` に `data-scroll-fade-in` 属性を追加
   - `params.scrollFadeIn.enable` の値を渡す（`viewTransitions` と同じパターン）
   - JS 側で `document.body.getAttribute("data-scroll-fade-in") === "true"` で有効判定
2. `assets/css/components/scroll-fade-in.css` を作成
   - `.scroll-fade-in` の初期状態（`opacity: 0; transform: translateY(20px)`）を定義
   - `.scroll-fade-in.is-visible` でアニメーション後の状態（`opacity: 1; transform: translateY(0)`）を定義
   - `transition` で `opacity` と `transform` をアニメーション（`0.6s ease-out`）
   - `@media (prefers-reduced-motion: reduce)` で即時表示にフォールバック
3. `assets/js/scroll-fade-in.js` を作成
   - IIFE モジュールとして実装
   - 起動時に `data-scroll-fade-in === "true"` をチェックし、無効なら何もしない
   - 対象セレクタ: `.post-row`（記事カード）、`.related-posts .related-post-item`（関連記事）
   - `IntersectionObserver` で `threshold: 0.1` を監視
   - 画面内に入ったら `.is-visible` クラスを付与し、一度表示した要素は `unobserve` する
   - `stagger` 効果: 複数要素が同時に視認された場合、`transition-delay` を `100ms` 間隔で動的付与（上限 5 要素 = 0.5s）
   - `init()` / `cleanup()` パターンで PJAX 対応
   - `window.__pochiScrollFadeIn` にハンドルを公開
   - `pochi:afterSwap` イベントリスナーで再初期化
4. `layouts/partials/core/resources_css.html` に新 CSS を追加
5. `layouts/partials/core/resources_js.html` に新 JS を追加
6. `example_site/hugo.toml` に `[params.scrollFadeIn]` セクションを追加（テスト用）
7. E2E テスト作成（Playwright）
   - フェードインが発動すること
   - `prefers-reduced-motion: reduce` 時にアニメーションが無効化されること
   - PJAX 遷移後にも正常動作すること

## File changes

| File                                       | Change                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `layouts/_default/baseof.html`             | `<body>` に `data-scroll-fade-in` 属性を追加（`params.scrollFadeIn.enable` の値を渡す） |
| `assets/css/components/scroll-fade-in.css` | **新規作成**: `.scroll-fade-in` / `.is-visible` スタイル + reduced-motion 対応          |
| `assets/js/scroll-fade-in.js`              | **新規作成**: IntersectionObserver ベースのフェードイン IIFE モジュール                 |
| `layouts/partials/core/resources_css.html` | CSS バンドルに `scroll-fade-in.css` を追加                                              |
| `layouts/partials/core/resources_js.html`  | JS バンドルに `scroll-fade-in.js` を追加                                                |
| `example_site/hugo.toml`                   | `[params.scrollFadeIn]` セクションに `enable = true` を追加                             |
| `e2e/scroll-fade-in.spec.js`               | **新規作成**: E2E テスト                                                                |

## Risks and mitigations

| Risk                                          | Mitigation                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| JS 無効環境で要素が非表示のまま               | CSS の `.scroll-fade-in` に `<noscript>` フォールバック、または JS で初めてクラスを付与する設計にし、JS 無効時は素の表示を維持 |
| PJAX 遷移後に Observer が残るメモリリーク     | `cleanup()` で `disconnect()` を呼び、`pochi:afterSwap` で再生成                                                               |
| 大量の要素で `stagger delay` が長くなりすぎる | delay の上限を設ける（例: 最大 5 要素分 = 0.5s）                                                                               |
| CLS (Cumulative Layout Shift) への影響        | `transform` + `opacity` のみ使用でレイアウトに影響なし。要素のサイズ・位置は変えない                                           |
| 既存 View Transitions との干渉                | View Transitions はページ遷移時、fade-in はスクロール時で発火タイミングが異なるため干渉しない                                  |

## Validation

- [x] `params.scrollFadeIn.enable = true` でフェードインが有効になる
- [x] `params.scrollFadeIn.enable = false`（またはキー未設定）でアニメーションが無効になり、通常表示になる
- [x] 記事一覧ページで `.post-row` がスクロール時にフェードインする
- [x] 関連記事セクションの `.related-post-item` がスクロール時にフェードインする
- [x] ページ読み込み時、ファーストビュー内の要素は即座に表示される（アニメーションなし or 即時表示）
- [x] 複数カードが同時に視認された場合、stagger（100ms 間隔）で順番にフェードインする
- [x] `prefers-reduced-motion: reduce` 設定時、アニメーションなしで即時表示される
- [x] JS 無効環境で全要素が通常通り表示される
- [x] PJAX ナビゲーション後、新しいページでもフェードインが正常動作する
- [x] Lighthouse Performance スコアに有意な悪化がない
- [x] E2E テストが全件パスする
- [x] CSS / JS の lint エラーがない

## Open questions

- なし（全項目確定済み）
