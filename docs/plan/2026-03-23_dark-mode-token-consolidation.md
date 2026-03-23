# Plan: ダークモードを tokens.css の変数切替に一本化する

ダークモードの色管理が `tokens.css` の `:root.dark` 変数と `main.css` 等の `.dark` セレクタで二重管理になっている。
トークン変数の切替だけで完結する設計に統一し、不要な `.dark` ルールを削除して保守性を改善する。

## Background

- `tokens.css` に `:root.dark` ブロックがあり、主要な色変数（`--pochi-card`, `--pochi-text`, `--pochi-surface-soft` 等）をダークモード用に上書きしている
- にもかかわらず `main.css:458-550` に `.dark` セレクタが53箇所あり、同じ変数を個別セレクタで再適用している
- コンポーネント CSS（`sidebar.css`, `code.css`）にも散在
- トークン設計への移行が中途半端に止まった状態で、どちらが正か判断しにくい

## Current structure

### tokens.css の `:root.dark` で切替済みの変数

| 変数                    | Light              | Dark                     |
| ----------------------- | ------------------ | ------------------------ |
| `--pochi-text`          | `#424242`          | `#c9d1d9`                |
| `--pochi-text-muted`    | `#555555`          | `#a1a1a1`                |
| `--pochi-bg`            | `#f5f5f5`          | `#1d1d1d`                |
| `--pochi-card`          | `#ffffff`          | `#2f2f2f`                |
| `--pochi-surface`       | `#ffffff`          | `#2f2f2f`                |
| `--pochi-surface-soft`  | `#f5f5f5`          | `#1d1d1d`                |
| `--pochi-border`        | `#d8d8d8`          | `#a1a1a1`                |
| `--pochi-blockquote-bg` | `#f5f5f5`          | `#212121`                |
| `--pochi-hover`         | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |

### `.dark` ルールの分布

| ファイル      | `.dark` ルール数 |
| ------------- | :--------------: |
| `main.css`    |        53        |
| `sidebar.css` |        5         |
| `code.css`    |        4         |
| **合計**      |      **62**      |

## Design policy

- **トークン変数の自動切替を信頼する** — `:root.dark` で変数値が変わるので、変数を参照しているルールに `.dark` 上書きは不要
- **ダーク専用の振る舞いは残す** — グラデーション方向変更、アイコン出し分け、ダーク専用シャドウ等は `.dark` セレクタが正当に必要
- **コードブロックのダーク対応はトークン化する** — `code.css` の `.dark` ルールは `--pochi-inline-code-*` 変数のダーク値を `tokens.css` に追加することで解消
- **段階的に進める** — 1ステップごとにビルド確認し、視覚的なリグレッションがないことを検証

## Implementation steps

1. **削除対象の `.dark` ルールを特定・分類する**
2. **`tokens.css` にインラインコード用のダーク変数を追加する**
3. **`main.css` からデッドコードの `.dark` ルールを削除する**
4. **`code.css` の `.dark` ルールをトークン参照に置換する**
5. **`sidebar.css` のデッドコードを削除する**
6. **`main.css` の IE/Edge ハックを削除する**
7. **ライト/ダーク両モードで全ページを目視確認する**

### Step 1: 削除対象の分類

`.dark` ルールを3カテゴリに分類する。

#### A. 削除可能（変数の再適用のみ — トークン切替で十分）

| 行 (main.css) | セレクタ                                                                                                                                                                                                                                                                                                                                                                     | 適用値                                                                 |
| :-----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
|    458-475    | `.dark article`, `.comments`, `.mymenu-related-list`, `.dropdown-list`, `.article-list .post-row`, `nav.site-nav`, `footer.footer-section`, `.form-control`, `.btn-primary`, `.btn-secondary`, `.table-of-contents p span`, `#sidebar .tagcloud a`, `#sidebar .table-of-contents`, `#search-for:focus`, `.pagination .page-link`                                             | `background-color: var(--pochi-card); color: var(--pochi-text)`        |
|    477-494    | `.dark #logo-container`, `.logo`, `.article-list a h2`, `.mymenu-related a .text`, `.article-list .post-info`, `.mymenu-related .post-info`, `.article-list .post-excerpt`, `article .kiji-tag li a`, `nav.site-nav ul a`, `nav.site-nav`, `#side-nav ul a`, `#theme-toggle-switch`, `#sidebar a`, `.table-of-contents ol li a`, `footer p.copyright`, `footer .copyright a` | `color: var(--pochi-text)`                                             |
|    496-499    | `.dark #breadcrumbs li`, `#breadcrumbs li a`                                                                                                                                                                                                                                                                                                                                 | `color: var(--pochi-text-muted)`                                       |
|    501-507    | `.dark .btn-primary:hover`, `.btn-secondary:hover`, `.pagination .page-link:hover`, `#sidebar .tagcloud a:hover`                                                                                                                                                                                                                                                             | `background-color: var(--pochi-accent); color: var(--pochi-on-accent)` |
|    509-512    | `.dark .article-list a:hover h2`, `.mymenu-related a:hover .text`                                                                                                                                                                                                                                                                                                            | `color: var(--pochi-accent)`                                           |
|    514-521    | `.dark #side-nav`, `.main-content`, `#breadcrumbs`, `#sidebar h2 span`, `footer h2 span`, `.pagination .page-item.active .page-link`                                                                                                                                                                                                                                         | `background-color: var(--pochi-surface-soft)`                          |
|    523-526    | `.dark pre`, `blockquote`                                                                                                                                                                                                                                                                                                                                                    | `background-color: var(--pochi-blockquote-bg)`                         |

sidebar.css:

|   行    | セレクタ                                                | 理由                                             |
| :-----: | ------------------------------------------------------- | ------------------------------------------------ |
| 248-250 | `.dark #sidebar-left .like-btn[aria-pressed="true"]`    | Light と同値 `var(--pochi-accent)`               |
| 301-303 | `.dark #sidebar-left h2 span`, `#sidebar-right h2 span` | `var(--pochi-surface-soft)` はトークンで切替済み |

#### B. 残す（ダーク専用の振る舞い）

| 行 (main.css) | セレクタ                                                                      | 理由                                                                      |
| :-----------: | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
|    528-537    | `.dark .table-of-contents p:before`, `#sidebar h2:before`, `footer h2:before` | グラデーション方向が `separator-end-dark` / `separator-mid-dark` に変わる |
|    539-542    | `.dark .article-list .post-row:hover`                                         | `border-color` 追加 + `shadow-card-hover-accent` はダーク専用             |
|    544-546    | `.dark .icon-light`                                                           | アイコン表示切替                                                          |
|    548-550    | `.dark .icon-dark`                                                            | アイコン表示切替                                                          |

sidebar.css:

|   行    | セレクタ                                                    | 理由                                 |
| :-----: | ----------------------------------------------------------- | ------------------------------------ |
| 305-313 | `.dark #sidebar-left h2:before`, `#sidebar-right h2:before` | グラデーション方向がダーク用に変わる |

#### C. トークン化で解消（code.css）

| 行 (code.css) | セレクタ                                         | 対応                                                                                                            |
| :-----------: | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
|     46-48     | `.dark pre`                                      | `--pochi-code-bg` をダークモードでも使うことを明示するか、既にライトモードの pre が同じ変数を使っているなら不要 |
|     50-55     | `.dark p > code`, `ul li > code`, `ol li > code` | `--pochi-inline-code-bg` / `--pochi-inline-code-border` のダーク値を tokens.css に追加                          |
|     65-68     | `.dark .article-list .post-excerpt code`         | 同上                                                                                                            |

### Step 2: tokens.css にインラインコード用ダーク変数を追加

`:root.dark` ブロックに以下を追加する:

```css
:root.dark {
  /* 既存の変数 ... */

  /* Inline code */
  --pochi-inline-code-bg: var(--pochi-code-bg);
  --pochi-inline-code-border: transparent;
}
```

### Step 3: main.css からデッドコードの `.dark` ルールを削除

カテゴリ A の全ルール（`main.css:458-526`）を削除する。残すのは `main.css:528-550` のみ。

### Step 4: code.css の `.dark` ルールをトークン参照に置換

`code.css` のライトモードルールが `var(--pochi-inline-code-bg)` を使っていれば、Step 2 のトークン追加により `.dark` ルール（46-68行）は全て不要になる。pre の背景色がライトモードで別の値を使っている場合は要確認。

### Step 5: sidebar.css のデッドコードを削除

カテゴリ A の2箇所（248-250行、301-303行）を削除する。

### Step 6: IE/Edge ハックを削除

`main.css:431-448` の `@supports (-ms-ime-align: auto)` と `@media all and (-ms-high-contrast: none)` を削除する。IE11 / 旧Edge は 2022年にサポート終了済み。

### Step 7: 目視確認

ライト/ダーク両モードで以下のページを確認する（Validation セクション参照）。

## File changes

| File                                | Change                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `assets/css/tokens.css`             | `:root.dark` に `--pochi-inline-code-bg`, `--pochi-inline-code-border` を追加 |
| `assets/css/main.css`               | `.dark` ルール群（458-526行）を削除、IE/Edge ハック（431-448行）を削除        |
| `assets/css/components/code.css`    | `.dark` ルール（46-68行）を削除（トークン化により不要に）                     |
| `assets/css/components/sidebar.css` | デッドコード（248-250行、301-303行）を削除                                    |

## Risks and mitigations

| Risk                                                                               | Mitigation                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ライトモードで色がハードコードされているセレクタがあり、`.dark` の上書きが実は必要 | 削除前にライトモードの各セレクタが `var(--pochi-*)` を使っているか確認する。ハードコードがあれば先にトークン変数に置換 |
| specificity の違いでトークン切替だけでは色が変わらないケースがある                 | `.dark` ルール削除後にダークモードで全ページ目視確認。問題があればライトモード側のセレクタの specificity を調整        |
| code.css のインラインコード表示が変わる                                            | Step 2 のトークン追加後、ライト・ダーク両方でインラインコードの見た目を確認                                            |
| ユーザーが独自に `.dark` セレクタに依存したカスタム CSS を追加している可能性       | テーマ内の CSS のみがスコープ。ユーザーカスタム CSS は対象外と明記                                                     |

## Validation

- [ ] `hugo server` でローカルビルドが成功する
- [ ] ライトモードで以下のページの表示が変わらない: トップページ、記事一覧、記事詳細、カテゴリページ
- [ ] ダークモードで以下の要素が正しい色になっている:
  - [ ] 記事カード背景・テキスト色
  - [ ] ナビゲーションバー背景・リンク色
  - [ ] サイドバー背景・見出し装飾
  - [ ] フッター背景・テキスト色
  - [ ] パンくずリスト色
  - [ ] ボタンホバー色
  - [ ] ブロック引用背景
  - [ ] コードブロック・インラインコード背景
  - [ ] ページネーション色
- [ ] テーマトグル（ライト↔ダーク）の切替が即座に反映される
- [ ] IE/Edge ハック削除後、Chrome / Firefox / Safari で表示崩れがない

## Open questions

- `main.css:528-537` のグラデーション用変数 `--pochi-separator-end-dark` / `--pochi-separator-mid-dark` もトークン化して `.dark` セレクタを不要にするか（将来的な追加改善として検討可能だが、今回のスコープでは残す方針）
- `main.css:539-542` の `.dark .post-row:hover` で追加される `border-color: var(--pochi-accent)` をライトモードにも適用するかどうか（デザイン判断）
