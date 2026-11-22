# hover モーションの統一プラン

## Context

hover したときの反応がコンポーネントごとにバラバラ。ナビや検索ボタンは 0.2s でふわっと変わり、タグ・ページネーション・サイドバーのリンクなどは transition が無いので即座に切り替わる。原因は 3 つある。

1. transition を各コンポーネントが自分で書くオプトイン方式で、書き忘れた所は 0s になる
2. 共通トークン `--pochi-transition-interactive`（`assets/css/tokens.css:183`）に `border-color` と `text-decoration-*` が入っていない
3. 書いてある所でも、easing（`ease` / `ease-in-out`）と duration（0.15s / 0.2s）がばらついている

ゴール：hover の手触りを 1 つの方針にそろえ、トークンと stylelint でその状態を保つ。

決めたこと：**入りは速く（120ms）、出はゆっくり（200ms）にする**。stylelint ガードも**入れる**。

## 棚卸し（現状）

| 種類                         | 対象                                                                                                                                                                                                                                                                                                              | 現状                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| ふわっと（0.2s ease）        | 検索ボタン `.btn-secondary`、カード `.post-row` / `.post-nav a`、`#scroll-to-top`、見出しアンカー、カードの h2、関連記事                                                                                                                                                                                          | `--pochi-transition-interactive`                 |
| ふわっと（0.2s ease-in-out） | ナビのリンク、`.dropdown-toggle`                                                                                                                                                                                                                                                                                  | `nav.css:150,200` に直書き                       |
| 0.15s ease                   | lightbox の閉じるボタン、フォームの枠                                                                                                                                                                                                                                                                             | `lightbox.css:65`、`forms.css:31`                |
| opacity だけ 0.2s            | コードのコピーボタン                                                                                                                                                                                                                                                                                              | `code.css:58`。reduced-motion も自前で書いている |
| **即時（0s）**               | タグ `.kiji-tag li a`、ページネーション、言語切替 `.lang-switcher-link`、サイドバーのリンク全般、いいね/共有/SNS ボタン、アーカイブの開閉ボタン、`.profile-link`、フッターのリンク、`#side-nav-close` の背景、TOC の `ul` 側（下線の `::after` が `ol` にしか効いていない：`toc.css:63`）、本文リンクの下線の太さ | transition が無い                                |
| 中途半端                     | `.btn-*:hover` は `border-color` も変えるが、トークンに無いので枠だけ即時に変わる                                                                                                                                                                                                                                 | トークンの不足                                   |
| hover 自体が無い             | `#theme-toggle-switch`、`#menu-bar-btn`                                                                                                                                                                                                                                                                           | 対象外（下の「別途」を参照）                     |

## 理論・手法（調査の要点）

- **応答の閾値**：Nielsen の 0.1s（操作と結果がつながって感じられる上限）と Doherty threshold。hover への反応は 100–150ms 以内に始まると「即応」に感じる。200ms を超えると「遅れて追ってくる」感じになる
- **主要デザインシステムの値**：
  - Material 3：short1–4 が 50–200ms、標準の easing は `cubic-bezier(0.2, 0, 0, 1)`
  - IBM Carbon（productive motion）：fast-01 が 70ms、fast-02 が 110ms、moderate-01 が 150ms
  - Fluent 2：faster 100ms、fast 150ms
  - どれも「小さな状態変化 ＝ 短く（100–150ms）、減速カーブ」
- **入り/出の非対称**：入りは速くして応答性を出す。出は少し長くして、カーソルがリストを横切ったときにチカチカする残像を和らげる（Linear や GitHub などで定番）。CSS では、ベースの状態に書いた transition が「出」に、`:hover` 側に書いた `transition-duration` が「入り」に効く
- **easing**：状態変化は ease-out 系（速く始まって減速）が反応よく感じられる。`ease` や `ease-in-out` は立ち上がりが遅いので「ほんわり」の原因になる
- **一貫性の担保**：値は semantic トークンに集約し、直書きを lint で禁止する。これまで色・radius・z-index でやってきた方式と同じ
- **transition するプロパティ**：`all` は使わずに列挙する。color / background / border / shadow / opacity / transform / text-decoration だけにして、レイアウトに関わるプロパティは動かさない
- **reduced-motion**：既存どおり、duration トークンを 0s にして一括で止める

## 実装方針

### 1. トークン（`assets/css/tokens.css`）

- 追加するトークン
  - `--pochi-duration-hover-in: 0.12s`
  - `--pochi-duration-hover-out: var(--pochi-duration-sm)`（0.2s）
  - `--pochi-ease-standard: cubic-bezier(0.2, 0, 0, 1)`
- `--pochi-transition-interactive` の作り直し
  - duration は hover-out、easing は ease-standard にする
  - プロパティに `border-color`、`text-decoration-color`、`text-decoration-thickness` を足す
  - `bottom` は `#scroll-to-top` が使っているので残す
- `--pochi-duration-xs`（0.15s）の扱い：フォームと lightbox を hover-in に寄せたあと、使う所が残らなければ削除する
- reduced-motion のブロックに新しい duration トークンを足す（0s にする）

### 2. ベースで一括適用（`assets/css/base.css`、base レイヤー）

```css
:where(a, button, summary) {
  transition: var(--pochi-transition-interactive);
}
@media (hover: hover) {
  :where(a, button, summary):hover {
    transition-duration: var(--pochi-duration-hover-in);
  }
}
```

`:where()` なので詳細度は 0。いま即時になっているリンク・ボタンは、これで全部そろう。

**注意**：components レイヤーに書いた `transition` は base レイヤーに勝つ。そのため、a / button に対して各コンポーネントが書いている transition は削除してベースに任せる。対象は次のとおり。

- `buttons.css:8`
- `nav.css:150,200`
- `lightbox.css:65`
- `code.css:58`（自前の reduced-motion ブロックも削除）
- `post-nav.css:39`
- `article.css:126`（`.heading-anchor`）

### 3. a / button 以外がアニメーションする箇所（components に残す）

親の hover で子や疑似要素が変わる箇所は、ベースのルールでは拾えない。そこで、各 hover ルールに `transition-duration: var(--pochi-duration-hover-in)` を 1 行ずつ足す。

- `.article-list .post-row`（カードの影）
- `.article-list .post-card:hover h2`
- `.related-card:hover img`（`related.css:26` の直書きもトークンにする）
- `.mymenu-related .text`
- `.heading-anchor-wrapper:hover .heading-anchor`
- `nav .dropdown:hover > .dropdown-toggle`
- `#scroll-to-top`
- TOC の `a::after`：`ol` だけに付いている transition を `ul` にも付ける（`toc.css:63`）

`scroll-fade-in.css:10` は、`.post-row` の box-shadow の値をトークンで書き直す。fade-in の 0.6s はそのまま残す。

### 4. テーマ切替時のちらつき対策（`assets/js/main.js` の `applyTheme`）

リンク・ボタン全体に color の transition が付くので、ダーク/ライトを切り替えたときに一部だけ 200ms 遅れて色が変わる。そこで、よくある手法を入れる。

1. `applyTheme` の前に `<html>` に `is-theme-switching` クラスを付ける
2. テーマを反映したら、reflow を挟んでから次のフレームでクラスを外す
3. CSS は utilities レイヤーに `:root.is-theme-switching * { transition: none; }` を置く（レイヤー順で勝つので `!important` は要らない）

### 5. stylelint ガード（`.stylelintrc.json`、severity は error、`tokens.css` は対象外にする）

- `declaration-property-unit-disallowed-list`：`transition`、`transition-duration`、`animation`、`animation-duration` で `s` / `ms` を禁止する
- `declaration-property-value-disallowed-list`：`/^(transition|animation)/` で、`ease` / `ease-in` / `ease-out` / `ease-in-out` / `linear` / `all` のキーワードを禁止する
  - 正規表現は前後に lookbehind / lookahead を付けて `var(--pochi-ease)` に誤ヒットしないようにする：`(?<![-\w])…(?![-\w])`
- `function-disallowed-list` に `cubic-bezier` と `steps` を足す
- `view-transitions.css:16` の `animation-duration: 0s !important` は、既存の disable コメントにルール名を追記して残す

### 6. ドキュメント

- `tokens.css` の Motion コメントに、入り/出の方針を書く
- `AGENTS.md` の Ratchets の stylelint の項に、transition のガードを 1 行足す
- 慣例どおり、このプランを `docs/plan/2026-11-22_hover-motion.md` として保存する

### 別途（今回はやらない）

テーマ切替ボタンとハンバーガーボタンには hover の見た目そのものが無い。これも「非対称」ではあるので、必要なら `--pochi-hover` の背景を付ける案を別に出す。

## 検証

- `npm run lint`：stylelint の error が 0、ratchet が一致すること。わざと `0.3s` を書いて落ちることも確かめる
- `npm run style:diff -- --states default,hover`：差分が `transition-*` の計算値だけで、hover 時の色・影は変わらないこと。差分は PR に貼る
- `npm run e2e`、`npm run vrt`：VRT は `animations: "disabled"` なので、ベースラインは変わらない想定
- `npm run a11y`
- `npm run serve` で手動確認する
  - タグ・ナビ・検索ボタン・ページネーション・サイドバー・TOC を hover して、入りの速さと戻りの遅さが同じに感じられること
  - DevTools の Animations パネルを 10% 速度にして、各要素の duration と easing が同じになっていること
  - テーマを切り替えたときに色の遅れが出ないこと
  - OS の「視差効果を減らす」をオンにしたら即時になること
