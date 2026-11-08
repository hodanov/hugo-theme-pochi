# Plan: P4 本文タイポグラフィ・和文組版

デザイン磨き込みロードマップ（`2026-10-19_design-refinement-roadmap.md`）の P4。P3 で読み上げとキーボードの土台が揃ったので、本文そのものの読みやすさ（文字サイズ・行送り・行長・和文の組み方）を直す。

見た目が変わる PR しかない。意図した差分は各 PR で VRT のベースラインに載せ、PR に before / after を添える。

## Background

- 対象の監査 ID：T-01〜T-05、T-07〜T-09（T-06 は P3A で解消済み）。
- ロードマップで決めてあること：ルートを `font-size: 100%` にする変更は単独の PR。本文は 16→17px、weight 400、line-height 1.8（単位なし）。フォントスタックは `:lang(ja)` / `:lang(en)` で出し分ける。`line-break: strict`、`overflow-wrap: anywhere`、`text-autospace`、`text-wrap: pretty / balance`、見出しにだけ `palt`。本文の行長は `max-inline-size: 40em`。見出しのスケールは Utopia で作る。
- 完了条件：font-size のトークンは 9 個以下。line-height は単位なしだけ。1 行の文字数（自動計測）が 1280px 幅で 36〜42 字、375px 幅で 20 字以上。320px 幅で横スクロールが出ない。

## Current structure

棚卸し（2026-11-08、main = a25422c）：

- ルートの文字サイズは `base.css` で 14px（〜767px）/ 15px（768px〜）/ 16px（1200px〜）。ブラウザの文字サイズ設定が効かない（T-01）。
- 本文は `body { font-weight: 300 }`（`forms.css` にもう 1 か所）。欧文は SF の Light、和文はヒラギノの W3 で、太さが揃わない（T-02）。
- line-height は rem 固定が 15 か所（`article p` の 2rem、`lists.css` の 2rem など。stylelint のラチェット `declaration-property-unit-disallowed-list[line-height]` が 15）。body は normalize の 1.15 のまま（T-03）。
- 本文の行長は列の幅だけで決まる（1280px で 672px）（T-04）。
- `article` に非推奨の `word-break: break-word`。禁則・和欧間のアキ・`text-wrap` の指定は無い（T-05）。
- フォントスタックは 1 本（`-apple-system, BlinkMacSystemFont, "Helvetica Neue", "ヒラギノ角ゴ ProN W3", "Hiragino Kaku Gothic ProN", Arial, Meiryo, sans-serif`）。等幅は `Consolas` が先頭（T-07）。
- font-size の値は 19 種類（0.75rem〜3.2rem、px が 3 つ、`clamp()` が 5 つ）。stylelint の strict-value ラチェットが 40 件。見出しの `clamp()` の vw はほとんど効かず、h4〜h6 は固定の 1.2rem（T-08）。
- `pre` の line-height が 1.2。インラインコードの見た目が `p / li / td / th > code` と一覧の要約にしか当たらない（T-09）。
- 1 行の文字数（styleguide の和文の段落。本文の幅 ÷ 文字サイズ）：

  | 幅     | 文字サイズ | 本文の幅 | 1 行の全角字数 |
  | ------ | ---------- | -------- | -------------- |
  | 375px  | 14px       | 319px    | 22.8           |
  | 768px  | 15px       | 392px    | 26.1           |
  | 1280px | 16px       | 672px    | 42.0           |

  モバイルの本文の左右は、列の 1rem とカードの 1rem で片側 2rem。ルートを 16px にすると 311px ÷ 16px = 19.4 字で、20 字を切る。

- hodalog：本文は和文が中心。和文と英数字が直に並ぶ箇所が 1548、間に半角スペースを入れた箇所が 823 ある（記事の `index.md` を数えた）。テーマのテンプレートと CSS は上書きしていない。

## Design policy

### PR の分け方

3 本にする。各 PR は単独で出荷でき、影響する VRT とラチェットは同じ PR で更新する。

1. **4A ルートの文字サイズ**（`fix/p4a-root-size`）：T-01 だけ。計測もここで足す。
2. **4B 文字サイズ・行送り・ウェイト**（`fix/p4b-type-scale`）：T-02、T-03、T-08、T-09。
3. **4C 和文組版と行長**（`fix/p4c-ja-typesetting`）：T-04、T-05、T-07。

### 計測（4A で先に足す）

- `tests/a11y/measure.spec.js`（a11y プロジェクト、Docker で文字が揃う）：styleguide（ja）の和文の段落で、本文の幅 ÷ 文字サイズを 1 行の全角字数として測る。1280px で 36〜42、375px で 20 以上。320 / 375 / 768 / 1280px で横スクロールが出ないこと（`scrollWidth <= innerWidth`）。
- ブラウザの文字サイズ設定が効くことは、Playwright でルートの既定を変えられないので、`html` の font-size が `100%`（16px）で、`rem` 以外の固定の px が本文に無いことで代える。

### ルートの文字サイズ（4A）

- `html { font-size: 100% }` にし、幅ごとの 14 / 15px の段を消す。rem で書いた大きさは、モバイルで 1.14 倍、タブレットで 1.07 倍になる（デスクトップは変わらない）。
- そのままだとモバイルの 1 行が 19.4 字になるので、モバイルの本文の左右を片側 2rem → 1.5rem（列 0.75rem、カード 0.75rem）に詰める（311px → 327px、20.4 字）。列の作りは P5 で Grid に置き換えるので、ここでは余白の値だけを変える。
- ナビやボタンなど、rem で書いた部品もモバイルで大きくなる。崩れは VRT で見て、その PR の中で直す。

### 文字サイズのスケール（4B）

- Utopia の流体スケールにする。320px で 16px・比 1.125、1240px で 17px・比 1.2。段は −2〜4 の 7 つ（ページの h1・ヒーロー用に 5 を足すなら 8 つ）。

  | 段  | 320px | 1240px | 主な使い道                         |
  | --- | ----- | ------ | ---------------------------------- |
  | −2  | 12.6  | 11.8   | タグ、メタ情報                     |
  | −1  | 14.2  | 14.2   | 日付、サイドバー、フッター、コード |
  | 0   | 16    | 17     | 本文                               |
  | 1   | 18    | 20.4   | h4〜h6                             |
  | 2   | 20.3  | 24.5   | h3                                 |
  | 3   | 22.8  | 29.4   | h2                                 |
  | 4   | 25.6  | 35.3   | 記事の h1                          |

- トークンは `--pochi-step--2`〜`--pochi-step-4`（`clamp()`、rem と vw）。CSS の font-size は全部トークンにし、strict-value のラチェットを 0 にする。ブラウザの拡大で効くように、`clamp()` の最小・最大は rem で書く。
- 今の見た目との差：記事の h1 は 26.6〜38.4px → 25.6〜35.3px、h2 は 22.4〜32px → 22.8〜29.4px、h3 は 18.2〜25.6px → 20.3〜24.5px。h4〜h6 は 1.2rem で固定 → 段 1。

### 行送りとウェイト（4B）

- line-height はトークンにして単位なしだけにする：本文 1.8（JLREQ の 175〜190%）、UI 1.5、見出し 1.4、コード 1.6。body に UI の 1.5 を置き、記事の本文（段落・リスト・引用・表）を 1.8 にする。stylelint の line-height のラチェットを 0 にする。
- `font-weight` を 300 → 400 にする（body と `forms.css`）。欧文は SF の Light → Regular になり、和文はヒラギノの W3 のまま（Hiragino Kaku Gothic ProN は W3 / W6 しか無く、300 でも W3 だった）。欧文だけが細かったのが揃う。
- 段落の間隔は 2rem → 1.8em（行送りと揃える）にする。

### コード（4B）

- `pre` の line-height を 1.2 → 1.6。インラインコードを `:not(pre) > code` に当て、どこに置いても同じ見た目にする（見出し・リンクの中も）。
- 等幅のスタックは 4C で変える。

### 和文組版と行長（4C）

- フォントスタック（T-07）：
  - 和文（`:lang(ja)`）：`-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "BIZ UDPGothic", Meiryo, "Noto Sans JP", sans-serif`
  - 欧文（`:lang(en)`）：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - 等幅：`ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`（和文は和文のスタックに落ちる）
  - トークンは `--pochi-font-ja`、`--pochi-font-en`、`--pochi-font-mono` にし、`--pochi-font-base` を lang で選ぶ。
- 組版（T-05）：
  - `:lang(ja)` の本文に `line-break: strict`（行頭の小書きの仮名や長音も禁則にする）。
  - `article` の `word-break: break-word` を `overflow-wrap: anywhere` に替える（長い URL と識別子だけを途中で折る）。表のセルは 3B-2 の `min-inline-size: 6em` があるので、縮みすぎない。
  - `text-autospace: normal`（和文と英数字の間に 1/8em のアキ。Chrome 140 以降。非対応のブラウザは今のまま）。hodalog で直に並ぶ 1548 か所にアキが付き、半角スペースを入れた 823 か所は今のまま（半角スペースの方が広い）。
  - `text-wrap: pretty`（段落）、`text-wrap: balance`（見出し）。
  - `font-feature-settings: "palt"` は見出しにだけ（本文は等幅の方が読みやすい）。
- 行長（T-04）：記事の本文のブロック（段落・リスト・引用・表の外枠）に `max-inline-size: 40em`。1280px では列の 672px の方が狭いので効かず（39.5 字）、列が広がる P5 以降の上限になる。

## Implementation steps

### PR 4A `fix/p4a-root-size`

1. 本書を作り、P3 の計画書に完了の記録を足す。
2. `tests/a11y/measure.spec.js` を足し、今の main で 375px の 20 字が通ること（22.8 字）を確かめる。
3. ルートを 100% にし、モバイルの左右の余白を詰める。measure が通り、20 字を切る余白（片側 2rem のまま）だと落ちることを確かめる。
4. VRT で崩れを見て直し、ベースラインを更新する。before / after を PR に貼る。

### PR 4B `fix/p4b-type-scale`

1. スケール・行送りのトークンを足す。
2. font-size と line-height を全部トークンにし、stylelint の 2 つのラチェットを 0 にする。
3. ウェイト、段落の間隔、コード。

### PR 4C `fix/p4c-ja-typesetting`

1. フォントのトークンと lang の出し分け。
2. 禁則・`overflow-wrap`・`text-autospace`・`text-wrap`・`palt`。
3. 行長。

## File changes

- 新規：本書、`tests/a11y/measure.spec.js`
- 変更：
  - `assets/css/` の tokens・base・typography、components（article・lists・code・content・nav・sidebar・toc・footer・chip・profile・article-list・related・hero・forms など font-size / line-height を持つもの）、`layout/grid.css`（モバイルの余白）
  - `tests/baselines/stylelint.json`、`tests/vrt/`、styleguide のトークン見本
  - `AGENTS.md`、ロードマップ

## Risks and mitigations

- **4A でモバイルの部品が大きくなる**：ナビのロゴやボタンが 1 行に収まらないことがある。VRT の 375px で見て、同じ PR で直す。
- **4B で見出しの位置が変わる**：見出しのスケールが変わり、全ページの縦の位置がずれる。VRT のベースラインは全部更新になるので、PR に代表的なページの before / after を貼り、差分の理由を書く。
- **ウェイト 400**：和文が少し濃く見える。コントラストは上がる方向なので検査は変わらない。
- **`overflow-wrap: anywhere`**：flex / grid の子の最小幅を縮める。サイドバーやカードの幅が変わらないかを VRT で見る。
- **`text-autospace`**：Chrome だけで効く。VRT は Chromium なので、差分に出る。
- **hodalog への影響**：全記事の見た目が変わる。取り込み PR の CF Pages のプレビューで、長い記事・表・コードの多い記事を見る。

## Validation

- 各 PR：`npm run lint`、`lint:html`、`a11y`（measure を含む）、`vrt`、`e2e` が通る。ラチェットは減った分だけ更新し、VRT は意図した差分だけ更新する。
- 4B：stylelint の strict-value（font-size）と line-height の単位のラチェットが 0。font-size のトークンが 9 個以下。
- P4 の完了条件：上の Background の完了条件。`npm run lighthouse` で A11y 100 のまま。
- 手動：Chrome の文字サイズを「大」にして、レイアウトが崩れないこと。

## Decisions

- 2026-11-08：計画をユーザーと確認した。
- 2026-11-08（4A）：`html { font-size: 100% }` にした。列の左右の余白を `--pochi-gutter`（1rem、768px 未満は 0.75rem）にし、モバイルのカードの余白も 1rem → 0.75rem にした。375px の 1 行は 327px ÷ 16px = 20.4 字、1280px は 42 字（変わらない）。余白を片側 2rem に戻すと measure.spec が 19.4 字で落ちることを確かめた。VRT は 375 / 768px の全ページと sg-tokens（`--pochi-gutter` が増えた）を更新した。768px は全体が 1.07 倍、375px は 1.14 倍になっただけで、崩れは無かった（フッターが 2 行になる）。stylelint の font-size のラチェットは 40 → 38（ルートの px が消えた）。
- 2026-11-08（4A）：記事ページ（post-toc）の 375px で、カードが画面より狭い（左右に約 60px）ことに気づいた。768px 未満の `#contents` に幅の指定が無く、本文が短いと flex の子が中身の幅まで縮み、`.centered` の margin auto で中央に寄る。前からある問題で、styleguide のように本文の長いページでは全幅になる。列を Grid に置き換える P5 で直す（ロードマップに L-10 として足した）。measure.spec は本文の長い styleguide で測るので、この影響を受けない。

- 2026-11-08（4B）：font-size を全部 `--pochi-step--2`〜`--pochi-step-5` の 8 個にした。段 −1 は 320〜1240px で 14.2px のままなので、`clamp()` ではなく 0.8875rem の固定にした。ルートの `font-size: 100%` は既定と同じなので宣言ごと消した。stylelint の font-size の strict-value は 38 → 0、line-height の単位は 15 → 0。body に段 0・ウェイト 400・行送り 1.5 を置き、記事の段落とリストは 1.8、段落とリストの下の間隔は 2rem → 1.8em。
- 2026-11-08（4B）：行の高さで部品の高さを決めていた所は、高さと揃えを別に書いた（言語リンクとサイドナビのリンクは `min-block-size` と flex の中央揃え）。ドロップダウンと目次の行は、今の 2rem に合わせて単位なしの 2.25 にした。
- 2026-11-08（4B）：インラインコードは `:not(pre) > code` 1 つにまとめ、大きさを周りの文字と同じ（`inherit`）にした。一覧の要約にだけ当てていたルールは消した。`pre` の行送りは 1.6。
- 2026-11-08（4B）：段 5 を足し、一覧のページの h1 とヒーローの文字に使った（1280px でヒーローは 48px → 42px、一覧の h1 は 51px → 42px）。VRT は全ページを更新した。主な差は、本文が 1280px で 16 → 17px、ウェイト 400、見出しのスケール、モバイルのロゴ（25.6px → 20.4px）。1280px の 1 行は 672px ÷ 17px = 39.5 字。archives@1280 は並列で撮ったときに 1 ピクセルずれた画像が残ったので、単独で撮り直し、全体で 2 回続けて通ることを確かめた。

## Open questions

- ~~段 5（ページの h1・ヒーロー）を足すか~~（4B で足した）
