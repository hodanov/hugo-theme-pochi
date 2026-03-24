# Plan: CSS の意図を明確にする — マジックナンバーの変数化、clamp() によるレスポンシブ整理

散在するマジックナンバーを CSS カスタムプロパティに抽出し、レスポンシブ対応を clamp() に統一する。
目的は「なぜその値か」を変数名で伝え、連動する値の変更漏れを防ぐこと。

## Background

- `article { padding: 3rem }` の `3rem` が `article h2 { margin-right: -3rem }` や `pre { margin: 3rem -3rem }` と暗黙に連動しており、片方だけ変更するとレイアウトが崩れる
- ナビバー高さ `4rem` が `hero.css`、`main-content.css`、`breadcrumbs.css` に散在し、変更時に複数ファイルを同時に修正する必要がある
- `typography.css` に `clamp()` によるレスポンシブ見出しサイズがあるが、`414px` メディアクエリで固定値にフォールバックしており冗長
- `hero-caption h1` は 3 段階のメディアクエリ（`3rem` → `2rem` → `1.5rem`）で段階的に縮小しており、clamp() で 1 行にまとめられる
- hero.css の calc バグ（`calc(61.8 - 4rem)` の `vh` 抜け）は remove-legacy-code で修正済み

## Current structure

### 記事カード padding の連動関係

```text
article { padding: 3rem }           ← 基準値
article h2 { margin-right: -3rem }  ← 負マージンで端まで伸ばす
article h2 { padding-right: 3rem }  ← 内容を元の位置に戻す
pre { margin: 3rem -3rem }          ← 同じく端まで伸ばす
pre { padding: 3rem }               ← 内容を元の位置に戻す

@media (max-width: 767px) {
  article { padding: 1rem }           ← モバイル基準値
  article h2 { margin-right: -1rem }
  article h2 { padding-right: 1rem }
  pre { margin: 1rem -1rem }
  pre { padding: 1rem }
}
```

すべて記事カードの padding に依存している。現状はこの関係がコードに明示されていない。

### ナビバー高さの参照箇所

| ファイル             | 箇所                                    | 値     |
| -------------------- | --------------------------------------- | ------ |
| `nav.css:18`         | `.navbar-fixed { height }`              | `4rem` |
| `nav.css:47-48`      | メニューリンク `height` / `line-height` | `4rem` |
| `nav.css:70-71`      | ブランドリンク `height` / `line-height` | `4rem` |
| `nav.css:133`        | ドロップダウン `line-height`            | `4rem` |
| `nav.css:331-332`    | モバイルナビ `height` / `line-height`   | `4rem` |
| `hero.css:4,17`      | `calc(61.8vh - 4rem)`                   | `4rem` |
| `hero.css:44,48`     | `calc(40vh - 4rem)`                     | `4rem` |
| `main-content.css:6` | `calc(100vh - 4rem - 4rem - 4rem)`      | `4rem` |
| `breadcrumbs.css:11` | `min-height: 4rem`                      | `4rem` |

### clamp() の現状

| 要素              | 現在の定義                                                      | 問題                                     |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `article h2`      | `clamp(1.6rem, 2vw, 2rem)` + `414px` MQ で `1.6rem` 固定        | MQ は clamp の min 値と同じで冗長        |
| `article h3`      | `clamp(1.3rem, 1.6vw, 1.6rem)` + `414px` MQ で `1.35rem` 固定   | MQ が min(1.3rem) より大きく微妙に不整合 |
| `article h4-h6`   | `1.2rem` 固定（main.css）                                       | レスポンシブ対応なし                     |
| `hero-caption h1` | `3rem` → `2rem`(1280px) → `1.5rem`(768px) の 3 段メディアクエリ | clamp() で 1 行にまとめられる            |
| `h1, h2`(非記事)  | `3.2rem` 固定                                                   | 小画面で大きすぎる可能性あり             |

### `main-content.css` の calc

```css
min-height: calc(100vh - 4rem - 4rem - 4rem);
```

3 つの `4rem` が何を指すか不明瞭。推定: ナビバー(4rem) + ブレッドクラム(4rem) + フッター(3.6rem、4rem に丸め)。

## Design policy

- **連動する値は CSS カスタムプロパティで 1 箇所に集約する** — 変更漏れ防止が最優先の目的
- **トークンは `tokens.css` の Layout セクションに追加する** — 色・フォントと同じ管理体系
- **変数名で意図を伝える** — `--pochi-card-padding`、`--pochi-nav-height` のように「何のための値か」が分かる名前にする
- **モバイルの padding 切り替えは `@media` 内で変数を再定義する** — 参照側は変数だけを見ればよい設計
- **clamp() は「1 行で完結する」場合のみ置き換える** — MQ 内で他のプロパティも同時に変更するケースは MQ を維持
- **article h3 の 414px MQ は clamp の min 値と不整合なので削除する** — `1.35rem` vs clamp min `1.3rem` は意図不明。clamp の min `1.3rem` を信頼する

## Implementation steps

### Step 1: Layout トークンを tokens.css に追加

`tokens.css` に Layout セクションを追加:

```css
/* Layout */
--pochi-nav-height: 4rem;
--pochi-breadcrumb-height: 4rem;
--pochi-footer-min-height: 4rem;
--pochi-card-padding: 3rem;
```

注: フッターの実際の `min-height` は `3.6rem` だが、`main-content.css` の calc では `4rem` に丸められている。既存の見た目を維持するためトークンも `4rem` とする。

モバイル用の card-padding は `@media` ブロックで `:root` を再定義:

```css
@media (max-width: 767px) {
  :root {
    --pochi-card-padding: 1rem;
  }
}
```

### Step 2: 記事カード padding の変数化

`main.css` と `code.css` のハードコードされた `3rem` / `1rem` を `var(--pochi-card-padding)` に置き換える。
`margin-right: -3rem` のような負の値は `calc(var(--pochi-card-padding) * -1)` を使う。

変更後のイメージ:

```css
/* main.css */
article,
.comments,
.mymenu-related-list {
  padding: var(--pochi-card-padding);
}

article h2 {
  margin-right: calc(var(--pochi-card-padding) * -1);
  padding-right: var(--pochi-card-padding);
}

/* code.css */
pre {
  margin: var(--pochi-card-padding) calc(var(--pochi-card-padding) * -1);
  padding: var(--pochi-card-padding);
}
```

モバイルの `@media` ブロックは、Step 1 で変数を再定義しているため個別の上書きが不要になる。`article`, `article h2`, `pre` のモバイル用固定値ルールを削除する。

### Step 3: ナビバー高さの変数化

`nav.css`、`hero.css`、`main-content.css`、`breadcrumbs.css` の `4rem` を `var(--pochi-nav-height)` に置き換える。

`main-content.css` の calc は名前付き変数で意図を明確にする:

```css
/* Before */
min-height: calc(100vh - 4rem - 4rem - 4rem);

/* After — ナビバー + ブレッドクラム + フッター */
min-height: calc(
  100vh - var(--pochi-nav-height) - var(--pochi-breadcrumb-height) -
    var(--pochi-footer-min-height)
);
```

### Step 4: 冗長な 414px メディアクエリの削除

`typography.css` の `@media (max-width: 414px)` ブロックを削除する:

```css
/* 削除対象 */
@media (max-width: 414px) {
  article h2 {
    font-size: 1.6rem;
  } /* clamp min と同値 → 冗長 */
  article h3 {
    font-size: 1.35rem;
  } /* clamp min 1.3rem と不整合 → 削除 */
}
```

### Step 5: hero-caption h1 を clamp() に置き換え

3 段階のメディアクエリを clamp() 1 行に統合する:

```css
/* Before */
.hero-caption h1 {
  font-size: 3rem;
}
@media (max-width: 1280px) {
  .hero-caption h1 {
    font-size: 2rem;
  }
}
@media (max-width: 768px) {
  .hero-caption h1 {
    font-size: 1.5rem;
  }
}

/* After */
.hero-caption h1 {
  font-size: clamp(1.5rem, 3.5vw, 3rem);
}
```

768px MQ 内の `text-align: left; margin: 0;` は font-size 以外のプロパティなので MQ を維持する。

### Step 6: 非記事 h1, h2 の font-size を clamp() に変更

`typography.css` の `h1, h2 { font-size: 3.2rem }` をレスポンシブ化する:

```css
/* Before */
h1,
h2 {
  font-size: 3.2rem;
}

/* After */
h1,
h2 {
  font-size: clamp(2rem, 4vw, 3.2rem);
}
```

カテゴリページタイトルなど、記事外の見出しが小画面で溢れないようにする。

### Step 7: ビルド確認・lint

Validation セクション参照。

## File changes

| File                                    | Change                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/css/tokens.css`                 | Layout セクションに `--pochi-nav-height`, `--pochi-breadcrumb-height`, `--pochi-footer-min-height`, `--pochi-card-padding` を追加。モバイル用 `@media` で再定義 |
| `assets/css/main.css`                   | `article` padding、`article h2` 負マージン、モバイル MQ 内の固定値を変数に置き換え                                                                              |
| `assets/css/components/code.css`        | `pre` の margin/padding を変数に置き換え、モバイル MQ 内の固定値を削除                                                                                          |
| `assets/css/components/nav.css`         | `height: 4rem` / `line-height: 4rem` を `var(--pochi-nav-height)` に置き換え                                                                                    |
| `assets/css/components/hero.css`        | `calc(... - 4rem)` を `calc(... - var(--pochi-nav-height))` に置き換え                                                                                          |
| `assets/css/layout/main-content.css`    | `calc(100vh - 4rem - 4rem - 4rem)` を名前付き変数に置き換え                                                                                                     |
| `assets/css/components/breadcrumbs.css` | `min-height: 4rem` を `var(--pochi-breadcrumb-height)` に置き換え                                                                                               |
| `assets/css/components/typography.css`  | `414px` MQ を削除。`h1, h2 { font-size: 3.2rem }` を `clamp()` に変更                                                                                           |
| `assets/css/components/hero.css`        | `hero-caption h1` の 3 段 MQ を `clamp()` に統合（768px MQ の非 font-size プロパティは維持）                                                                    |

## Risks and mitigations

| Risk                                                                            | Mitigation                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `calc(var(--pochi-card-padding) * -1)` がブラウザ互換性で問題を起こす           | `calc()` 内での `var()` は Chrome 49+ / Firefox 31+ / Safari 9.1+ で対応済み。pochi の対象ブラウザで問題なし |
| モバイル用 `@media` での `:root` 変数再定義が他のコンポーネントに影響する       | `--pochi-card-padding` を参照するのは `article` / `pre` / `article h2` のみ。影響範囲が限定的                |
| フッターの実際の `min-height`(3.6rem) とトークン値(4rem) にズレがある           | 既存の calc が `4rem` で動作しているため、トークンも `4rem` を維持。見た目の変化なし                         |
| clamp() の vw 係数が意図したブレークポイントと完全に一致しない可能性            | 既存の MQ 境界値（768px, 1280px）付近で意図した font-size になるよう係数を計算して検証する                   |
| article h3 の 414px MQ 削除で、1.35rem → 1.3rem に微小な font-size 変化が起きる | 0.05rem（0.8px 程度）の差は視認不能。clamp の min 値を信頼する                                               |

## Validation

- [x] `hugo server` でビルドが成功する
- [x] 記事ページ: `article h2` が端まで伸び、`pre` ブロックが端まで広がる（デスクトップ・モバイル両方）
- [x] カテゴリページ: 見出しが小画面で溢れない
- [x] ヒーロー画像: 高さがナビバー分を引いた値になっている
- [x] 414px 以下の画面で article h2 / h3 の font-size が自然に縮小する
- [x] main-content の min-height がフッターを押し下げている（短いコンテンツページで確認）
- [x] Chrome / Safari / Firefox で目視確認
- [x] prettier パス

## Open questions

- なし（すべて解決済み）

## Resolved questions

- `main-content.css` の 3 つの `4rem` → ナビバー + ブレッドクラム + フッターで確定。それぞれ `--pochi-nav-height`、`--pochi-breadcrumb-height`、`--pochi-footer-min-height` に分離する
- `article h4-h6` のレスポンシブ化 → 不要。`1.2rem` は最小 viewport(320px, base 14px)でも 16.8px で十分な可読性があり、これ以上縮めると本文(1rem)との差がなくなる
