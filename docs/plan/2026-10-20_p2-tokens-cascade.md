# Plan: P2 トークン基盤とカスケード（見た目は変えない）

デザイン磨き込みロードマップ（`2026-10-19_design-refinement-roadmap.md`）の P2。P3 以降で色・文字・レイアウトを変える前に、CSS の土台を整える。

- 値の出どころを 1 か所にする（デザイントークン）
- 優先順位を詳細度と記述順の偶然に頼らず、層で決める（`@layer`）
- 雑多な `main.css` と未使用のルールを片付ける

見た目は変えない。変わるのは、下の「意図した差分」に挙げたものだけ。

## Background

- 対象の監査 ID：L-01、L-02（z-index と角丸）、L-03、L-04、L-08、A-18、A-24、P-04（`color-scheme`、`theme-color`、`shrink-to-fit`）。
- P1 で安全網が揃った：VRT 42 枚、axe とアウトライン、stylelint・html-validate・コントラストのラチェット、Lighthouse。
- ただし VRT が撮るのは 3 幅の初期状態だけで、hover・focus・ドロワー・ツールチップは写らない。トークン化やレイヤー化はこれらの状態のスタイルにも触るので、VRT とは別に、computed style を全要素で比べる道具を用意する。

## Current structure

棚卸し（2026-10-20、main = bb48830）：

- CSS は 29 ファイル・2,692 行（vendor を除く）。`main.css` が 439 行あり、要素の既定スタイル・ボタン・記事カード・関連記事・ダークモードの上書きが混ざっている。中身の 3 割は「moved to ...」のコメントと未使用のルール。
- `tokens.css`：色と影だけ。ダーク配色の 17 個を `:root.dark` と `@media (prefers-color-scheme: dark)` に 2 回書いている。`color-scheme` の指定は無い（A-18）。
- `tokens.css` の外：`.dark` を使うルールが 7 個（区切り線のグラデーション 2、カードの hover、はてなアイコン、アイコンの切替 2）。直書きの色は hex 5・rgba 3。
- z-index は 21 宣言・9 値（1 / 2 / 5 / 10 / 100 / 997 / 999 / 1001 / 9999）。角丸は 9 値（0.25rem / 2px / 4px / 6px / 8px / 0.15rem / 50% / 0 ほか）。
- `!important` は 18 個。うち 9 個は `.u-visually-hidden`。
- メディアクエリの境界は 576 / 767 / 768 / 1200 / 1280px。`max-width: 768px` と `min-width: 768px` が 768px ちょうどで両方当たる（L-03）。
- 未使用のルール（テーマのテンプレート・JS、example_site、サイトのテンプレートと記事本文を grep して確認）：
  - クラス：`.aligncenter` / `.alignleft` / `.alignright`、`.button-collapse`、`.card-image-width`、`.category-page`、`.category-description`、`.collapsible*`、`.columns`、`.div-content` / `.div-cover`、`.form-floating` / `.form-select`、`.icatch`、`.side-nav-open`、`.tagcloud`、`.u-focus-ring`、`.u-hidden`、`.widget_categories`、`.ytvideo`、`i.right`、`.lang-switcher` の `+ .arrow`、空の `.archives-year {}`
  - トークン：`--pochi-surface`、`--pochi-shadow-1`。上のルールを消すと `--pochi-teal`、`--pochi-primary`、`--pochi-divider`、`--pochi-overlay-light`、`--pochi-text-shadow-soft` も未使用になる。
  - 残すもの：`.page-item` / `.page-link`（Hugo 内蔵のページネーション）、`.footnote-*`（Goldmark）、`.twitter-tweet`（Hugo 内蔵の x shortcode）、`.btn-primary` と `.required`（サイトの問い合わせページが使う）。

## Design policy

### PR の分け方

3 本に分け、それぞれ単独で「見た目が変わらない」ことを確かめてから出す。

1. **PR A 整理**：未使用の削除、`main.css` の分割と共通化、ブレークポイントの正規化。先に消しておくと、PR B で移行するトークンが減る。
2. **PR B トークン**：色の 2 層化と `color-scheme`、z-index・角丸・モーション・フォーカスリングのトークン、`head/meta.html`。
3. **PR C カスケード**：`@layer` と `!important` の点検。ファイル構成が固まってから層を割り当てる。

### computed style の差分（`npm run style:diff`）

- 基準の ref（既定は `origin/main`）を `git archive` で取り出してビルドし、作業ツリーのビルドと並べる。
- HTML は作業ツリーのものを使い、CSS だけを差し替えて 2 回描画する（Playwright の `page.route`）。テンプレートの変更に引きずられず、CSS の変化だけを取り出せる。
- 全要素と `::before` / `::after` について、computed style の全プロパティを比べる。色は描画結果と同じ 8bit の sRGB に正規化してから比べる（`oklch()` と `rgb()` の書き方の違いを差分にしない）。
- 状態は 4 つ：初期、hover、focus、active。
  - hover と focus は、CSS の `:hover` / `:active` と `:focus` / `:focus-visible` / `:focus-within` を `:not(.__sd-never)` に書き換えて全要素に当てる。詳細度は同じ（疑似クラス 1 個 = クラス 1 個）で、初期描画から当たるのでトランジションの途中値も拾わない。
  - active は、スクリプトが切り替える状態を全部オンにする：`aria-pressed` / `aria-expanded` を `true` に、ドロワーを開き、トップへ戻るボタンを出す（コピー完了のチップやアーカイブの開閉がこれで写る）。始まったトランジションは終わらせてから読む。
- 対象は a11y と同じ 13 ページ × ライト / ダーク × 375 / 768 / 1280px。差分は「プロパティ：基準 → 変更後」でまとめ、どのページのどの要素かを添える。親と同じ変化は継承とみなして親にまとめる。
- 差分が出たら 500ms 待って両側を読み直し、2 回とも違うものだけを数える。1 回だけのものは「不安定」として別に出す。
- 開発用の道具で、CI には入れない（基準のビルドが要り、PR ごとに意図した差分が違うため）。P5 のレイアウト移行でも使う。

### トークン（PR B）

- **primitive**：生の色。OKLCH で書き、名前の数字は OKLCH の明度（`--pochi-gray-97` は L 97%）にする。数字がそのまま明るさの差を表すので、コントラストの見当が付けやすい。値は今の hex と 8bit で一致する精度で書き、元の hex をコメントに残す。
- **semantic**：役割の名前（`--pochi-text`、`--pochi-link` など今の名前を引き継ぐ）。`light-dark(<light>, <dark>)` で primitive を参照する。
  - `:root { color-scheme: light dark }`、`:root.light { color-scheme: light }`、`:root.dark { color-scheme: dark }`。JS が無いときは OS の設定に従うので、`prefers-color-scheme` のブロックが要らなくなり、ダーク配色の重複が消える（L-01）。フォームやスクロールバーもダークになる（A-18）。
  - `.dark` で色を上書きしていたルール（区切り線、はてなアイコン、カードの hover）は semantic トークンに置き換える。
  - `light-dark()` は 2024-05 に Baseline（newly available）になった。非対応のブラウザ（Safari 17.4 以前など）には `@supports not (color: light-dark(#000, #fff))` でライトの値だけを渡し、テーマ切替のボタンを隠す。ダークモードは使えないが、崩れはしない。
- **component**：部品の中だけで使う値（`--pochi-card-padding` など）。
- **z-index**：役割の名前を付け、値は今のまま（同値の順序も含めて重なり方を変えない）。
- **角丸**：`sm 2px` / `md 0.25rem` / `lg 6px` / `full 50%` の 4 つ。`0.15rem`（トップへ戻る）→ 2px、`4px`（ライトボックスの画像）→ 0.25rem、`8px`（ドロワーを閉じるボタン）→ 6px は 1〜2px 変わるが、どれも VRT に写らない状態の要素。
- **モーション**：時間（0.15 / 0.2 / 0.25 / 0.3 / 0.6s）とイージングを今の値のままトークンにする。P3A で `prefers-reduced-motion` のときに一括で 0 にできるようにするため。
- **フォーカスリング**：幅・色・オフセット。P3A で `:focus-visible` を統一する土台。
- **space / leading / font-size は P4 に回す**：今の余白と行送りは rem 固定で、P4 でルートの文字サイズを 100% にすると全部の寸法が変わる。スケールはそのときに文字サイズと一緒に設計しないと、すぐ作り直しになる。
- stylelint：色のルール（`color-no-hex`、`color-named`、rgb / hsl 系の関数）と、z-index・角丸の直書き（`declaration-property-value-allowed-list` で `var(--pochi-z-*)` / `var(--pochi-radius-*)` と `0` だけを許す）をエラーにする。font-size は P4 まで warning のラチェットのまま。

### カスケード（PR C）

- `core/resources_css.html` で、各ファイルを `resources.FromString` で `@layer <名前> { ... }` に包んでから結合する。先頭で順序を宣言する：`@layer reset, tokens, base, layout, components, utilities;`
- 割り当て：vendor の modern-normalize → reset、`tokens.css` → tokens、`base.css` と `typography.css` → base、`layout/*` → layout、`components/*` → components、`utilities.css` → utilities。
- `utilities` を最後の層に置けば、詳細度に関係なく勝つので、`.u-visually-hidden` の `!important` 9 個は要らなくなる。
- 残す `!important`：`[hidden] { display: none !important }`（部品の `display` に負けないようにする定番。重要宣言は前の層ほど強いので base に置くと最優先になる）と、reduced-motion で View Transitions のアニメーションを止める 1 個。ほかは原因を直して外す。

### ブレークポイント（PR A）

- range 構文（`width < 768px`）に揃え、境界を 768px と 1200px の 3 段階にする。
- `max-width: 768px`（`.main-content` の上余白、hero の見出しの寄せ）は `width < 768px` にする。768px ちょうどでデスクトップ側の値になる（意図した差分）。
- 例外を 2 つ残す。
  - 576px（`layout/grid.css` の `.col-sm-4`）：P5 で grid.css ごと CSS Grid に置き換えるので触らない。
  - 1280px（hero の高さ）：1200px に寄せると、1280px 幅で hero が 256px から 430px に伸びる。見た目の変更なので P5 で判断する。range 構文には書き換える。

### 意図した差分

| PR  | 差分                                                                                                                                    | 写る場所                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A   | 768px ちょうどで、ホーム（1・2 ページ目）と日本語ホームの上余白が 15px → 45px                                                           | VRT の home@768                                          |
| A   | 768px ちょうどで、hero の見出しが中央寄せになり上下の余白が付く                                                                         | 見出しの箱は中央に置かれるので画面上は動かない           |
| A   | スタイルガイドのトークン見本から、消したトークンが消える                                                                                | VRT の sg-tokens（2 枚）                                 |
| B   | ダークモードでフォーム部品・スクロールバーが暗くなる（`color-scheme`）                                                                  | VRT の sg-text@1280-dark（task list のチェックボックス） |
| B   | 角丸の 1〜2px の差（トップへ戻る、ライトボックス、ドロワーを閉じるボタン）                                                              | VRT には写らない。style:diff に出る                      |
| B   | 区切り線の透明端が `rgba(255,255,255,0)` → `transparent`（描画は同じ）                                                                  | どこにも出ない（下の Decisions）                         |
| B   | JS 無しで OS がダークのとき、区切り線・カード hover の影・はてなアイコンもダークの色になる（今までは `.dark` が付かずライトの色だった） | テストは JS ありなので写らない                           |
| B   | ダークのカード hover の `border-color` が accent → 文字色（カードに枠は無い）                                                           | style:diff だけ                                          |
| B   | スタイルガイドのトークン見本が primitive と semantic に分かれる                                                                         | VRT の sg-tokens（2 枚）                                 |

## Implementation steps

### PR A `refactor/p2-cleanup`

1. 本書を作り、ロードマップの P2 節を更新する。
2. `scripts/style-diff.mjs` と `npm run style:diff` を追加する。
3. 未使用のルールとトークンを消す（上の一覧）。`contrast-pairs.json` から消えたトークンのペア（teal-on-card、focus-primary-on-card）を外す。A-24 と A-04 の teal はこれで解消。
4. `main.css` を分割して消す。
   - `body`・ルートの文字サイズ → `base.css`。`mark`・`strong` → `typography.css`。表・引用 → `content.css`。`a:hover` は効果が無い（`a` で下線を消している）ので消す。
   - ボタン → `components/buttons.css`（今は空のプレースホルダ）。テーマ切替ボタン → `nav.css`。トップへ戻る → `scroll.css`。
   - 記事カード・見出しの飾り・タグ・コメント → `components/article.css`（新規）。関連記事 → `components/related.css`（新規）。
   - ダークモードの上書きは、対応する部品のファイルへ移す（PR B でトークンに置き換える）。
5. 共通化する（L-04）。
   - コピー完了のチップ（コードのコピー、左サイドバーとモバイルのシェア）→ `components/chip.css`。3 つのセレクタを 1 つのルールにまとめ、位置だけを各部品に残す。
   - 線の上に文字を載せる見出し（目次、サイドバー、フッター）→ `components/section-heading.css`。共通部分を部品より前に読み、線の幅と文字の背景色は各部品が同じ詳細度で上書きする。
6. ブレークポイントを range 構文にし、768px の重なりを直す。`@media (min-width: 0)` を外す。
7. `resources_css.html` のファイル一覧を更新する。
8. style:diff と VRT で差分を確認し、768px の VRT ベースラインと stylelint のベースラインを更新する。

### PR B `refactor/p2-tokens`

1. `tokens.css` を primitive / semantic / component に分け、`light-dark()` と `color-scheme` にする。`@supports not` のフォールバックを足す。
2. 直書きの色・z-index・角丸をトークンにする。モーションとフォーカスリングのトークンを足して使う。
3. `head/meta.html`：`<meta name="color-scheme" content="light dark">` と `theme-color`（ライト / ダーク）を足し、`shrink-to-fit=no` を消す。
4. `check-contrast.mjs`：`prefers-color-scheme` の重複検査をやめ、次を検査する。
   - `:root` / `:root.light` / `:root.dark` の `color-scheme`
   - `@supports not` のフォールバックが、`light-dark()` を使うトークンを漏れなく、ライトの値で宣言していること
5. stylelint の色・z-index・角丸のルールをエラーにし、`lint-css.mjs` がルール違反のエラーを設定エラーと分けて報告するようにする。
6. スタイルガイドのトークン見本（`example_site/layouts/shortcodes/tokens.html`）を primitive と semantic に分けて表示する。

### PR C `refactor/p2-layers`

1. `resources_css.html` でレイヤーに包む。`main.css` が消えているので、ファイル単位で割り当てられる。
2. `!important` を点検する（上の方針）。
3. style:diff と VRT で差分 0 を確かめる。崩れたところは、詳細度に頼っていた箇所なので、セレクタか層の割り当てで直す。

## File changes

- 新規
  - `scripts/style-diff.mjs`
  - `assets/css/components/{article,related,chip,section-heading}.css`
  - 本書
- 削除
  - `assets/css/main.css`
- 変更
  - `assets/css/` のほぼ全ファイル、`layouts/partials/core/resources_css.html`、`layouts/partials/head/meta.html`
  - `scripts/{check-contrast.mjs,contrast-pairs.json,lint-css.mjs}`、`.stylelintrc.json`
  - `tests/baselines/{stylelint,html-validate}.json`、`tests/vrt/__snapshots__/`（意図した差分のみ）、`tests/vrt/styleguide.spec.js`
  - `example_site/layouts/shortcodes/tokens.html`
  - `package.json`、`AGENTS.md`、ロードマップ

## Risks and mitigations

- **記述順に頼っていたルールが逆転する**：`main.css` は結合の最後にあったので、同じ詳細度なら勝っていた。分割で前に移すと負けることがある。style:diff で全要素・4 状態を比べて検出する。
- **レイヤーで勝敗が変わる**：前の層のルールは、詳細度が高くても後ろの層に負ける。同じく style:diff で検出する。
- **`light-dark()` 非対応のブラウザ**：ライトの値に落とす。テーマ切替ボタンを隠し、押しても変わらない状態を作らない。
- **サイト側の CSS**：hodalog はテーマの CSS に上書きを足していない（サイトのテンプレートに CSS の読み込みが無い）。今後サイトで足す CSS はレイヤーの外になり、テーマより常に強い。
- **バンドルサイズ**：未使用の削除で減り、primitive とレイヤー宣言で増える。完了条件の ±5% で確かめる。

## Validation

- 各 PR：`npm run style:diff` の差分が「意図した差分」と一致する。`npm run vrt` が通る（PR A は 768px の 3 枚、PR B はダークでスクロールバーやフォームが写る枚数だけ更新する）。
- 各 PR：`npm run lint`、`lint:html`、`a11y`、`e2e` が通る。ラチェットは件数が減った分だけ更新する。
- PR B：`lint:contrast` が通る。`@supports not` のフォールバックからトークンを 1 つ消すと失敗する。`:root.dark` の `color-scheme` を消すと失敗する。
- PR B / C：色・z-index・角丸の直書きを 1 つ足すと stylelint がエラーで落ちる。
- P2 の完了時：`npm run lighthouse` の CSS 転送量が P1 終了時（8.3KB）から 5% を超えて増えない（未使用の削除で減るのは構わない）。

## Decisions

- 2026-10-20：PR を 3 本（整理 → トークン → カスケード）に分けた。
- 2026-10-20：VRT が写さない状態を補うため、computed style の差分を取る `style:diff` を作る。CI には入れない。
- 2026-10-20：space / leading / font-size のトークンは P4 で作る（ルートの文字サイズを変えると作り直しになるため）。
- 2026-10-20：`light-dark()` 非対応のブラウザはライトのみにする。
- 2026-10-20：576px と 1280px のブレークポイントは P5 まで残す。
- 2026-10-20（PR A）：style:diff は 312 通り（13 ページ × 2 テーマ × 3 幅 × 4 状態）を約 45 秒で回す。変更なしで差分 0、hover の色・focus の outline・`::before` の幅・チップの padding・トップへ戻るボタンの位置を変えるとそれぞれ検出し、`oklch()` / `rgb()` で書いた同じ色は差分にならないことを確かめた。一度だけ `.container-fluid` の margin が 40px → 0px と出て再現しなかったので、読み直して 2 回とも違うものだけを数えるようにした。
- 2026-10-20（PR A）：`main.css` の分割と未使用の削除は style:diff の差分 0 で確かめた。CSS バンドルは 39,599 → 35,411 バイト（-10.6%）、stylelint は 183 → 151 件、html-validate は 1129 → 1105 件（トークン見本のインラインスタイルが減った分）。
- 2026-10-20（PR A）：`content.css` は消さずに、表・引用・x shortcode の置き場にした（もともとそのためのファイルで、中身は未使用の align 系だけだった）。同じ transition が 5 か所にあったので、`--pochi-transition-interactive` を PR A で先に足した（PR B で duration のトークンに分ける）。
- 2026-10-20（PR A）：トークンを消すとスタイルガイドの見本が 46.125px 短くなり、後ろの sg-media の位置が小数点以下でずれて、画素の 18% が差分になった（CSS は同じ）。VRT で撮る前に見本の高さを整数 px に切り上げ、トークンを増減しても sg-tokens 以外の節が揺れないようにした。PR B でトークンを組み替えるときに効く。

- 2026-10-20（PR B）：primitive は今使っている 19 色だけにした（ランプを埋める色は P3 で配色を見直すときに足す）。OKLCH の値は、8bit に丸める前の値が段の中央から 0.1 段以内に収まる桁数で書いた（ブラウザごとの変換誤差で隣の段に落ちないように）。名前の数字は明度を四捨五入したもの（`--pochi-gray-99` は L 98.5%）。半透明の重ね色と影は「黒か白に alpha」なので rgba() のまま残した。
- 2026-10-20（PR B）：`:root.light` / `:root.dark` は `color-scheme` だけを持ち、テーマ別の値は `light-dark()` に寄せた。`light-dark()` を tokens.css の外で使うのは stylelint で禁止した（フォールバックの網羅は check-contrast が tokens.css だけを見て確かめるため）。はてなアイコンの色は既存の semantic（text-muted と bg）と同じ値だったので、それに置き換えた。
- 2026-10-20（PR B）：`light-dark()` 非対応の再現として、CSS の `light-dark(` を無効な関数名に置き換えて読み込ませ、OS がライト / ダークの両方でライトテーマと computed style を比べた。違いはテーマ切替ボタンが消えることと、それによるナビの右寄せのずれだけで、色の差は無かった。
- 2026-10-20（PR B）：`check-contrast.mjs` はトークンの色を 8bit に丸めてから測るようにした。OKLCH は 8bit の hex と小数点以下で少しずれるので、丸めないと比が 0.01 動いて差分が読みにくい。丸めた結果、P2 PR A の出力と 1 文字も変わらない。`theme-color` の値が `--pochi-card` と一致することも検査に足した。
- 2026-10-20（PR B）：`iframe { color-scheme: light }` を base.css に足した。ルートがダークになると、ライトの文書を埋め込んだ iframe（x の埋め込みなど）には不透明な背景が敷かれる（iframe 要素と中の文書の配色が食い違うとき）。PR B の前と同じ描画に留める。
- 2026-10-20（PR B）：style:diff は、完全に透明な色を RGB に関係なく同じ値に正規化する（`color-mix()` が premultiplied のため）。区切り線の透明端の書き換えは差分に出なかった。HTML は作業ツリーのものを使うので、`<meta name="color-scheme">` の効果も style:diff には出ず、VRT のダークで task list のチェックボックスが暗くなった差分（sg-text@1280-dark）で確かめた。スクロールバーはヘッドレスの Chromium では描かれない。
- 2026-10-20（PR B）：CSS バンドルは 35,339 → 38,611 バイト（gzip 7,609 → 8,102、+6.5%）。primitive の層、フォールバック、`var()` の参照が増えた分。完了条件の「P1 終了時（8.3KB）から +5% 以内」には収まる。stylelint は 151 → 105 件（色・z-index・角丸がエラーのルールに移り 0 件）、html-validate は 1105 → 1097 件。

## Open questions

- `theme-color` は OS の設定にしか追従しない。サイト内でテーマを切り替えたときにも合わせるかは、P3C のテーマ切替（3 状態）で決める。
