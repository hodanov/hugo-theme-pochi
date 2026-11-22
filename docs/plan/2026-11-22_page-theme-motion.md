# 画面遷移とテーマ切替のモーション統一プラン

## Context

hover は前回の PR（#299）で「入り 120ms / 出 200ms と減速カーブ」にそろった。次は、もっと大きな動きを同じ考え方にそろえる。今は次のようにちぐはぐになっている。

| 場面                                                  | 今の動き                                                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PJAX のページ遷移                                     | `navigation.js` の `swapContent()` が `startViewTransition`。画面全体（root）が 250ms・`ease-in-out` でクロスフェードし、変わらないナビやフッターも一緒にフェードする |
| フルリロードの遷移（言語切替、PJAX の対象外のリンク） | 演出なし（即時）                                                                                                                                                      |
| テーマ切替（ボタン）                                  | `main.js` でページ遷移と同じ 250ms の root クロスフェード                                                                                                             |
| テーマ切替（OS 側）                                   | 即時（`startViewTransition` を通っていない）                                                                                                                          |
| easing                                                | `ease` / `ease-in-out` / `ease-out` / `ease-standard` の 4 種類が混在している                                                                                         |

決めたこと：

- ページ遷移は **Fade through**（ナビとフッターは固定し、本文だけ旧→新で切り替える）
- テーマ切替は**クロスフェードを維持**する（長さと easing はトークンにそろえ、OS 側の切替にも付ける）

## 理論（要点）

- **Fade through**（Material の motion パターン）：内容のつながりが無い画面どうしを入れ替えるときに使う。旧画面は短く加速して消える（約 90ms）。新画面は少し遅れて、減速しながら現れる（約 210ms）。両方が同時に半透明になる時間が無いので、クロスフェードのような「二重に重なって濁る」瞬間が出ない
- **変わらないものは動かさない**：ナビとフッターは遷移の前後で同じ。名前付きの view transition で本文だけを切り出し、root（ナビとフッター）はアニメーションさせない
- **easing は役割で選ぶ**
  - 入ってくるもの：減速（enter）
  - 出ていくもの：加速（exit）
  - その場で状態が変わるもの：standard
- **テーマ切替は画面全体の色が変わる**ので、空間的な動きは付けない。素直なクロスフェードにして、長さはページ遷移とほぼ同じ「中くらい」にする
- **reduced-motion**：既存どおり duration トークンを 0s にする。`view-transitions.css` の `!important` ルールがすべての名前付きグループに効くので、そのまま使える

## 実装方針

### 1. トークン（`assets/css/tokens.css`）

- easing を追加する
  - `--pochi-ease-enter: cubic-bezier(0, 0, 0, 1)`（M3 standard decelerate）
  - `--pochi-ease-exit: cubic-bezier(0.3, 0, 1, 1)`（M3 standard accelerate）
- duration を追加する
  - `--pochi-duration-page-out: 0.09s`
  - `--pochi-duration-page-in: 0.21s`
  - どちらも reduced-motion のブロックで 0s にする
- テーマのクロスフェードは `--pochi-duration-md`（0.25s）と `--pochi-ease-standard` にする
- `--pochi-ease` / `--pochi-ease-in-out` / `--pochi-ease-out` は、下の 4 で使う所が無くなったら削除する。easing を役割の 3 種類（standard / enter / exit）に絞る

### 2. 遷移の種類を区別する共通ヘルパー（`assets/js/main.js`）

`startPochiTransition(kind, update)` を追加する。

- `kind` は `"page"` か `"theme"`
- VT が有効で、API があるときの流れ
  1. `<html data-vt="kind">` を付ける
  2. `document.startViewTransition(update)` を呼ぶ
  3. `finished` で属性を外す
  4. transition を返す
- VT が無効か API が無いときは、`update()` をそのまま呼んで `null` を返す
- `data-vt` 属性を使うのは、`startViewTransition({ types })` が未対応のブラウザにも合わせるため
- 呼び出し元
  - `main.js` のテーマボタン（`doToggle`）
  - `handleThemeChange`（OS 側の切替。今は即時なので、ここで演出を付ける）
  - `navigation.js` の `swapContent()`（今の `document.startViewTransition(doSwap)` を置き換える。`updateCallbackDone` の扱いはそのまま）
- `navigation.js` は別の IIFE だが、bundle で `main.js` の後に連結されるので、グローバル関数として呼べる
- 既存の `is-theme-switching`（hover の transition を止める仕組み）は、VT の new スナップショットにリンクの古い色が写るのを防ぐので残す

### 3. CSS（`assets/css/components/view-transitions.css`）

既定（属性なし。クロスドキュメントの遷移もこちらに入る）はページ遷移として扱う。

```css
.main-content {
  view-transition-name: pochi-main;
}

/* ナビ・フッター（root）は動かさない */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
}

/* 本文の箱が伸び縮みするモーフはしない */
::view-transition-group(pochi-main) {
  animation: none;
}

::view-transition-old(pochi-main) {
  animation: pochi-fade-out var(--pochi-duration-page-out)
    var(--pochi-ease-exit) both;
}

::view-transition-new(pochi-main) {
  animation: pochi-fade-in-up var(--pochi-duration-page-in)
    var(--pochi-ease-enter) var(--pochi-duration-page-out) both;
}

@keyframes pochi-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

テーマ切替のときは、本文を切り出さずに画面全体をクロスフェードする。

```css
:root[data-vt="theme"] .main-content {
  view-transition-name: none;
}

:root[data-vt="theme"]::view-transition-old(root),
:root[data-vt="theme"]::view-transition-new(root) {
  animation-duration: var(--pochi-duration-md);
  animation-timing-function: var(--pochi-ease-standard);
}
```

animation の shorthand は、stylelint の新しいガード（秒数と easing キーワードの直書き禁止）に引っかからない。トークンだけで書けるので問題ない。

### 4. フルリロードの遷移にも同じ演出を付ける（クロスドキュメント View Transitions）

- `@view-transition { navigation: auto; }` を `@media (prefers-reduced-motion: no-preference)` の中に置く
- サイトの設定 `params.viewTransitions.enable` が true のときだけ出力する
  - `layouts/partials/core/resources_css.html` で、`resources.FromString` を使って小さな CSS を components レイヤーに追加する
  - 新しいブラウザ（Chrome 126 以降、Safari 18.2 以降）は言語切替などでも Fade through になる。未対応のブラウザは今までどおり即時に切り替わる
- PJAX が拾う遷移はこれまでどおり JS 側で処理するので、二重にはならない

### 5. 残りの easing を役割に寄せる（duration は変えない）

- ドロワー `#side-nav` と backdrop（`nav.css`）
  - 開く：enter
  - 閉じる：exit（`[open]` 側と閉じた状態で timing-function を分ける）
- ドロップダウン（`nav.css`）：standard
- lightbox のオーバーレイ（`lightbox.css`）
  - 表示：enter
  - 非表示：exit
- scroll-fade-in（`scroll-fade-in.css`）：enter

## 検証

- `npm run lint`：stylelint の error が 0、ratchet が一致すること
- `npm run e2e`：`tests/e2e/f-17-view-transitions.spec.js` に次のテストを足す
  - PJAX 遷移中は `html[data-vt="page"]` が付き、終わったら外れること
  - テーマ切替では `data-vt="theme"` になること
  - `.main-content` の `view-transition-name` が `pochi-main` で、テーマ切替中は `none` になること
  - reduced-motion のときに 0s になる既存のテストも通ること
- `npm run vrt` / `npm run a11y`：VRT はアニメーションを止めて撮るので、差分は出ない想定（styleguide のトークン一覧は、トークンの増減で更新する）
- `npm run style:diff`：差分が `view-transition-name` と `transition-timing-function` / `animation-*` だけであること
- 手動確認（`npm run serve`。DevTools の Animations パネルで速度を落として見る）
  - 記事一覧から記事へ移るときに、ナビが動かず本文だけが「消える → 少し浮きながら出る」こと
  - 言語切替（フルリロード）でも同じ動きになること
  - テーマボタンと OS 側の切替の両方で、画面全体が 250ms でクロスフェードし、リンクの色が遅れないこと
  - reduced-motion を有効にしたら、どれも即時になること
- 完了したら、このプランを `docs/plan/2026-11-22_page-theme-motion.md` として保存する

## 実装時の変更

- 当初は `.main-content` に `view-transition-name` を常に付けていた。しかし `view-transition-name` が付いた要素は stacking context になるため、404 ページの本文の文字描画が変わり、VRT が落ちた
- そこで、名前は遷移中だけ付けるようにした（`:root[data-vt="page"] .main-content`）
- フルリロードの遷移では、`head/head.html` の `pageswap` / `pagereveal` リスナーで、出ていくページと入ってくるページの両方に `data-vt="page"` を付ける。`pagereveal` は最初の描画より前にリスナーが要るので、head のスクリプトに置く
- styleguide の `sg-media` は、トークンが 1 行増えて画像が 30px 下に移ったことで、写真の 26px だけ描画が変わった。小数部分の位置は同じだったので、ベースラインを更新した
- 一覧から記事へ移る瞬間に、旧本文が一瞬上に跳ねた。本文の箱のモーフを `animation: none` で止めていたため、旧本文のスナップショットが遷移先の本文の位置（ホームより 48px 上）にいきなり置かれていた
  - 箱は、旧本文が消える 90ms の間は元の位置と大きさのまま止め、新本文が出る瞬間に移すようにした（`--pochi-ease-hold: steps(1, end)`）
  - 名前付きのグループは root より上に描かれるので、ナビの下に潜っていた旧本文がナビに重なっていた。そこで、ナビにも遷移中だけ名前（`pochi-nav`）を付け、本文より上に描くようにした
