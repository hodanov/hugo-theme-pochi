# Plan: View Transitions API の有効化

既存の PJAX ナビゲーション（`navigation.js`）に組み込み済みだが無効化されている View Transitions API を、設定可能な形で有効化し、ページ遷移アニメーション用の CSS を追加する。

## Background

- `navigation.js` に PJAX + View Transitions の実装がすでに存在する（L10: `ENABLE_VIEW_TRANSITIONS = false`）
- `document.startViewTransition(doSwap)` によるコンテンツスワップ、`syncHead`、`syncHeaderUI`、`afterSwapInit` 等の基盤は完成済み
- 不足しているのは: (1) Hugo params による設定可能化、(2) `::view-transition-*` の CSS 定義、(3) `view-transition-name` の付与、(4) `prefers-reduced-motion` 対応
- Chrome/Edge は完全対応済み、Safari 18.2+ で部分対応（プログレッシブエンハンスメント前提で問題なし）

## Current structure

- `assets/js/navigation.js`: PJAX ナビゲーション。L10 のハードコード定数でトグル制御
- `layouts/_default/baseof.html`: `<body>` に `data-*` 属性でテンプレート値を JS に渡すパターンあり（`data-code-copy-label` 等）
- `assets/css/tokens.css`: デザイントークン（CSS 変数）。トランジション duration のトークンは未定義
- `layouts/partials/core/resources_css.html`: CSS バンドル定義。新規 CSS ファイルの追加はここに 1 行追加
- 既存のコンポーネント CSS では `transition: 0.2s ease` が標準的な duration

## Design policy

- **プログレッシブエンハンスメント**: `document.startViewTransition` 非対応ブラウザでは従来通りの即時遷移にフォールバック（既存実装で対応済み）
- **設定可能**: Hugo の `params.viewTransitions.enable` で ON/OFF を制御。デフォルトは `false`（オプトイン）
- **控えめなアニメーション**: デフォルトは crossfade（opacity 遷移）のみ。派手なスライドやズームは避ける
- **アクセシビリティ**: `prefers-reduced-motion: reduce` 時はアニメーションを無効化（即時遷移）
- **既存コードの最小変更**: `navigation.js` のトグル判定ロジックのみ変更。PJAX 本体のロジックは変更しない

## Implementation steps

1. `baseof.html` の `<body>` に `data-view-transitions` 属性を追加し、Hugo params の値を渡す
2. `navigation.js` の `ENABLE_VIEW_TRANSITIONS` をハードコード定数から `data-view-transitions` 属性の読み取りに変更
3. `assets/css/components/view-transitions.css` を新規作成し、root crossfade の `::view-transition-*` アニメーション定義を記述
4. `resources_css.html` に `view-transitions.css` を追加
5. `example_site/hugo.toml` に `params.viewTransitions.enable = true` を追加（テスト用）
6. `prefers-reduced-motion: reduce` で VT アニメーションを無効化する CSS を追加
7. E2E テストを追加（VT 有効時のナビゲーション動作確認）

## File changes

| File                                         | Change                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `layouts/_default/baseof.html`               | `<body>` に `data-view-transitions="{{ .Site.Params.viewTransitions.enable }}"` 追加     |
| `assets/js/navigation.js`                    | L9-13: `ENABLE_VIEW_TRANSITIONS` を `document.body` の data 属性から読み取る形に変更     |
| `assets/css/components/view-transitions.css` | 新規作成。`::view-transition-old/new(root)` の crossfade 定義 + `prefers-reduced-motion` |
| `layouts/partials/core/resources_css.html`   | `view-transitions.css` をバンドルに追加                                                  |
| `example_site/hugo.toml`                     | `[params.viewTransitions]` セクションに `enable = true` 追加                             |

## Implementation details

### JS 変更（`navigation.js` L9-13）

```js
// Before
const ENABLE_VIEW_TRANSITIONS = false;
const SUPPORTS_VT =
  ENABLE_VIEW_TRANSITIONS && typeof document.startViewTransition === "function";

// After
const ENABLE_VIEW_TRANSITIONS =
  document.body?.getAttribute("data-view-transitions") === "true";
const SUPPORTS_VT =
  ENABLE_VIEW_TRANSITIONS && typeof document.startViewTransition === "function";
```

### CSS（`view-transitions.css`）

```css
/* Default crossfade animation for View Transitions */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.25s;
  animation-timing-function: ease-in-out;
}

/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0s !important;
  }
}
```

### baseof.html 変更

```html
<body
  data-code-copy-label="{{ T "copy_code" }}"
  data-code-copied-label="{{ T "code_copied" }}"
  data-code-copy-failed-label="{{ T "copy_failed" }}"
  data-view-transitions="{{ with .Site.Params.viewTransitions }}{{ .enable }}{{ end }}"
>
```

## Risks and mitigations

| Risk                                                      | Mitigation                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Safari の VT 対応が不完全で表示崩れが起きる               | `document.startViewTransition` の存在チェック（既存実装で対応済み）。非対応ブラウザでは通常遷移にフォールバック |
| VT アニメーション中にユーザーが次のリンクをクリックする   | ブラウザの VT API が自動的に前のトランジションをキャンセルする                                                  |
| ダークモード切り替え時に VT が意図せず発火する            | ダークモードは CSS 変数の切り替えのみで、ナビゲーションを伴わないため VT は発火しない                           |
| デフォルト `false` を知らずにオンにしてパフォーマンス劣化 | duration を 0.2-0.25s と控えめに設定。`prefers-reduced-motion` で無効化。設定キーの命名を明示的に               |

## Validation

- [x] `params.viewTransitions.enable = true` でビルドし、Chrome でページ遷移時に crossfade アニメーションが表示される
- [x] `params.viewTransitions.enable = false`（またはキー未設定）で従来通りの即時遷移になる
- [ ] Firefox（VT 未対応）で正常にフォールバック動作する
- [ ] `prefers-reduced-motion: reduce` 設定時にアニメーションが無効化される
- [ ] ブラウザの戻る/進むボタンで正常にナビゲーションできる
- [x] ダークモード切り替えが VT と干渉しない
- [ ] Giscus コメント、検索、AdSense が PJAX ナビゲーション後に正常に動作する（既存動作の回帰テスト）
- [x] Lighthouse パフォーマンススコアに有意な劣化がない
- [x] `make build` が正常に完了する
- [x] 既存の E2E テストが pass する

## Decisions

- 初回は root の crossfade のみ。hero 画像や main-content への `view-transition-name` 付与は将来検討
- ページタイプ別のアニメーション切り替えは今回スコープ外
- named transition を使わないため、ヘッダー固定表示との干渉リスクもなし
