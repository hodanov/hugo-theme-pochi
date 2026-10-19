# Plan: デザイン磨き込みロードマップ（プロの手法・理論・ツールで進める）

pochi テーマのデザインを、デザイナー／FE エンジニアが実務で使う手法・理論・ツールに沿って見直す。今回はリブランドではなく**磨き込み**として扱う。2026-03〜04 に機能追加と部分的な a11y 修正は済んでいるが、デザインを「仕組み」で支える層がまだ無い（デザインシステム、和文組版、品質ゲート）。本書は P0（監査とベースライン）の成果物であり、P1 以降の各 Phase は着手時に個別のプラン文書を作る。

## Background

- **前提（2026-10-19 にユーザーと合意）**
  - 方向性：**磨き込み**。ティールのアクセント、カード UI、3 カラム構成という識別性は維持する。
  - 重点領域：本文の読みやすさ、アクセシビリティ、パフォーマンス、回遊性・発見性の 4 つすべて。
  - フォント：**システムフォントを維持**する（Web フォントは入れない）。
  - 作業環境：**コードファースト**。example_site のスタイルガイドページと Playwright のスクリーンショットで差分を管理し、Figma は使わない。
- 既存の品質ゲートは Prettier と Playwright E2E（`p-*` 11 本、`f-*` 17 本）だけ。stylelint、axe、VRT、Lighthouse CI、html-validate はどれも無い。
- 過去の関連プラン：`2026-03-24_accessibility-improvements.md`、`2026-03-25_wcag-and-html-fixes.md`、`2026-03-24_css-intent-clarification.md`、`2026-03-23_dark-mode-token-consolidation.md`、`2026-03-29_modern-blog-feature-ideas.md`。

## Current structure

### ベースライン計測（2026-10-19、Hugo 0.164.0、example_site を `--minify` でビルド）

| 項目                                    | 値                                                                                                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS バンドル（全ページ共通）            | 39,599 B（gzip 8,237 B）                                                                                                                                                                                                                        |
| JS バンドル（全ページ共通）             | 31,494 B（gzip 9,293 B）                                                                                                                                                                                                                        |
| 検索 vendor JS（検索ページのみ）        | 42,593 B（gzip 14,125 B）                                                                                                                                                                                                                       |
| CSS ファイル数・行数（vendor 除く）     | 29 ファイル・2,692 行                                                                                                                                                                                                                           |
| `font-size`                             | 宣言 51・値 20 種（トークン参照 0）                                                                                                                                                                                                             |
| `line-height`                           | 宣言 33・値 15 種（`2rem` `1rem` など rem 固定が中心）                                                                                                                                                                                          |
| `z-index`                               | 直書き 21・値 9 種（1〜9999）                                                                                                                                                                                                                   |
| `border-radius`                         | 値 9 種（`0.25rem` ×15 のほか 2px/4px/6px/8px/0.15rem）                                                                                                                                                                                         |
| メディアクエリの境界値                  | 5 種（576/767/768/1200/1280）。`max-width: 768px` と `min-width: 768px` が 768px で重なる                                                                                                                                                       |
| `!important`                            | 18                                                                                                                                                                                                                                              |
| `tokens.css` 外の色の直書き             | hex 5・rgb(a) 3                                                                                                                                                                                                                                 |
| `tokens.css` 外の `.dark` セレクタ      | 9                                                                                                                                                                                                                                               |
| `prefers-reduced-motion` の対応         | 3 ファイルのみ（code / scroll-fade-in / view-transitions）                                                                                                                                                                                      |
| `:focus-visible`                        | 5 箇所（`outline: none` / `0` が 2 箇所）                                                                                                                                                                                                       |
| 不合格のコントラストペア                | 6 組（下表 A-01〜A-04）                                                                                                                                                                                                                         |
| example_site の Lighthouse（P1 で追加） | `npm run lighthouse`（モバイル既定、3 回の中央値、gzip 配信）。home / post-toc / about / archives は Perf 100・A11y 100・BP 100・SEO 100、LCP 0.9〜1.2s。search は Perf 95・CLS 0.131（P-07）。転送量は CSS 8.3KB・JS 9.3KB（search は 23.3KB） |
| 本番の Lighthouse / CWV                 | **未取得**。PSI API はキー無しだと 1 日のクォータが 0。PSI の Web UI か API キーで、ホーム・`/claude-code-otel-grafana/`・`/tags/neovim/` をモバイルで計測して追記する                                                                          |

### 監査結果（ヒューリスティック評価と CSS 棚卸し）

重大度は Nielsen の 0〜4（4 = 致命的、3 = 重大、2 = 中程度、1 = 軽微）。ID は各 PR から参照する。

#### T: タイポグラフィ・和文組版

| ID   | 指摘                                                                                           | 根拠                                       | 基準・原則                | 重大度 | Phase |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- | ------ | ----- |
| T-01 | ルートの文字サイズが px 固定（14/15/16px）で、ブラウザの文字サイズ設定を無視する               | `main.css:19-35`                           | WCAG 1.4.4                | 3      | P4    |
| T-02 | `body { font-weight: 300 }`。欧文は SF Light、和文は W3 になり、ウェイトが揃わない             | `main.css:13`                              | 可読性                    | 2      | P4    |
| T-03 | body の line-height が normalize の 1.15 のまま。本文は `2rem` などの rem 固定                 | `typography.css:20,25`、`lists.css:10`     | JLREQ（行送り 175〜190%） | 2      | P4    |
| T-04 | 本文の行長に制限が無い                                                                         | `layout/grid.css`（col-md-8 だけで決まる） | JLREQ（35〜40 字）        | 2      | P4/P5 |
| T-05 | 禁則・和欧間アキ・`text-wrap` の指定が無い。非推奨の `word-break: break-word` を使っている     | `main.css:216`                             | JLREQ                     | 2      | P4    |
| T-06 | 日本語の引用を斜体（擬似斜体）にしている                                                       | `main.css:313`                             | JLREQ                     | 1      | P3A   |
| T-07 | フォントスタックに Hiragino Sans、BIZ UDPGothic、Noto Sans JP が無い。等幅は Consolas が先頭   | `tokens.css:36-38`、`code.css`             | 可読性                    | 2      | P4    |
| T-08 | 見出しのスケールが場当たり的（`clamp` の vw がほぼ効かない、h4〜h6 は固定 1.2rem）             | `typography.css:10-50`、`main.css:281`     | モジュラースケール        | 1      | P4    |
| T-09 | `pre` の line-height が 1.2。インラインコードのスタイルが `p/li/td/th > code` にしか当たらない | `code.css:3-37`                            | 可読性                    | 1      | P4    |

#### A: アクセシビリティ

| ID   | 指摘                                                                                                                                                                                 | 根拠                                                                                | 基準・原則                         | 重大度 | Phase |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------- | ------ | ----- |
| A-01 | ライトモードのリンク `#2a8c7e` が白背景で 4.08:1、`#f5f5f5` 背景で 3.74:1                                                                                                            | `tokens.css:14`                                                                     | WCAG 1.4.3                         | 4      | P3A   |
| A-02 | リンクに下線が無く、本文色との差が 2.47:1（ダーク 1.33:1）。色を暗くして A-01 を直すと差は 1.68:1 に縮むので、下線が必須                                                             | `typography.css:58`                                                                 | WCAG 1.4.1                         | 3      | P3A   |
| A-03 | アクセント `#79c6b6` の塗りの上の白文字が 1.99:1                                                                                                                                     | `nav.css:165`、`main.css:240`、`sidebar.css:81`、`pagination.css:24`、`base.css:28` | WCAG 1.4.3                         | 3      | P3A   |
| A-04 | `--pochi-required #ed929f` 2.28:1、teal `#26a69a` 3.00:1（ダークの card 上でも 4.46:1）。どちらも使っているのはテンプレートから参照されないクラス（`.required`、`.button-collapse`） | `tokens.css`、`main.css:43,161`                                                     | WCAG 1.4.3 / 1.4.11                | 2      | P3A   |
| A-05 | ホーム・一覧・タグ一覧・検索・404 に h1 が無い。404 は画像だけ                                                                                                                       | `_default/list.html`、`terms.html`、`search.html`、`404.html`                       | WCAG 1.3.1 / 2.4.6、Nielsen #9     | 3      | P3B   |
| A-06 | 目次（TOC）を 2 回描画しているため `id="TableOfContents"` が重複し、ラベルの無い nav が 2 つある                                                                                     | `posts/single.html:25`、`organisms/content.html:9`                                  | WCAG 4.1.1 相当 / 1.3.1            | 2      | P3B   |
| A-07 | PJAX で遷移した後、フォーカスを移さず、遷移の読み上げも無い                                                                                                                          | `navigation.js`（`navigateTo()`）                                                   | WCAG 2.4.3 / 4.1.3                 | 3      | P3C   |
| A-08 | サイドナビが `div` + `aria-hidden` で、tabindex を JS で付け替えている。開いてもフォーカスが中に移らない                                                                             | `side_nav.html`、`main.js:71-163`                                                   | APG Modal Dialog                   | 2      | P3C   |
| A-09 | 言語の `<select>` が値を変えた瞬間にページ遷移する。`<option>` に無効な `hreflang` がある                                                                                            | `lang_switcher.html`、`lang-switcher.js`                                            | WCAG 3.2.2                         | 2      | P3B   |
| A-10 | サイトナビに `role=menu` / `menuitem` を誤用している                                                                                                                                 | `nav.html:36-58`                                                                    | APG Disclosure Navigation          | 2      | P3B   |
| A-11 | アイコンの SVG に `aria-hidden` が無く、非推奨の `xlink:href` を使っている。日付の種類がアイコンでしか分からない                                                                     | `atoms/icon.html`、`post_meta_date.html`                                            | WCAG 1.1.1 / 1.3.1                 | 2      | P3B   |
| A-12 | alt が空の画像で `alt` 属性そのものを出力しない                                                                                                                                      | `atoms/picture.html`                                                                | WCAG 1.1.1                         | 2      | P3B   |
| A-13 | カード全体を 1 つの `<a>` にしていてリンク名が長い。サムネイルの alt がタイトルと重複する                                                                                            | `organisms/list_of_posts.html:7-35`                                                 | Inclusive Components（Cards）      | 2      | P3B   |
| A-14 | いいねボタンの名前がカウント値（「–」など）になる。シェアボタンに誤った `aria-pressed` がある                                                                                        | `like_button.html`、`share_button.html`                                             | WCAG 4.1.2                         | 2      | P3B   |
| A-15 | フォーカスの見た目が要素ごとにバラバラで、`:focus { outline: none }` が残っている。固定ヘッダーの高さ分を `offsetTop - 15` という場当たりの値で補正している                          | `nav.css:55`、`forms.css:43`、`main.js:9-10`                                        | WCAG 2.4.7 / 2.4.11                | 2      | P3A   |
| A-16 | 操作対象が 44px 未満（コピーボタン約 28〜32px、モバイルのトップへ戻る 32px、タグチップ約 26px、ドロワーを閉じる 36px）                                                               | `code.css`、`sidebar.css:198`、`nav.css:297`                                        | WCAG 2.5.8、Fitts の法則           | 1      | P3A   |
| A-17 | `prefers-reduced-motion` の対応が一部だけ。ホバー効果をタッチ端末でも出している                                                                                                      | 「ベースライン計測」を参照                                                          | WCAG 2.3.3                         | 1      | P3A   |
| A-18 | `color-scheme` を指定していないため、ダークモードでもスクロールバーとフォームが明るいまま                                                                                            | `tokens.css`、`head/meta.html`                                                      | 一貫性                             | 1      | P2    |
| A-19 | 検索結果に live region が無く、入力欄が `type=text`。クラスと id の間の空白が抜けている                                                                                              | `_default/search.html:14`、`search_form.html`                                       | WCAG 4.1.3                         | 2      | P3B   |
| A-20 | パンくずの区切りを `<li>` にしている。`aria-current` が無い。「Home」がハードコード                                                                                                  | `breadcrumbs.html`                                                                  | WCAG 1.3.1                         | 1      | P3B   |
| A-21 | `role="main"` が冗長。`<aside>` にラベルが無い                                                                                                                                       | 各 `<main>`、`sidebar_*.html`                                                       | WCAG 1.3.1                         | 1      | P3B   |
| A-22 | テーマ切替が 2 状態だけ。`handleThemeChange()` が OS の設定変更を `localStorage` に書き込んでしまう                                                                                  | `main.js:213-288`                                                                   | Nielsen #3（ユーザーの制御と自由） | 1      | P3C   |
| A-23 | ライトモードの入力欄の枠 `--pochi-border #d8d8d8` が card 上で 1.43:1                                                                                                                | `forms.css:29`                                                                      | WCAG 1.4.11                        | 2      | P3A   |
| A-24 | `.u-focus-ring` の `--pochi-primary #1a73e8` がダークの card 上で 2.97:1。クラス自体は未使用（L-08）                                                                                 | `utilities.css:23`                                                                  | WCAG 1.4.11                        | 1      | P2    |

#### L: レイアウト・デザインシステム

| ID   | 指摘                                                                                                                             | 根拠                                                       | 基準・原則                  | 重大度 | Phase  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------- | ------ | ------ |
| L-01 | トークンが色と影だけで、spacing / type / radius / z / motion が無い。ダーク配色を 2 箇所に重複定義している                       | `tokens.css:79-124`                                        | デザイントークンの 3 層構造 | 2      | P2     |
| L-02 | font-size 20 種、line-height 15 種、z-index 直書き 21、radius 9 種                                                               | 「ベースライン計測」を参照                                 | 一貫性（Nielsen #4）        | 2      | P2/P4  |
| L-03 | ブレークポイントがバラバラで、768px で重なっている                                                                               | `main-content.css:16`、`hero.css:52`                       | —                           | 2      | P2     |
| L-04 | `main.css` が 439 行の雑多な集まり。ツールチップを 3 回、グラデーション線の見出しを 4 回コピーしている                           | `code.css:96`、`sidebar.css:179,316`、`toc.css:17-35` ほか | DRY / ITCSS                 | 1      | P2     |
| L-05 | Bootstrap 風の flex グリッドで、テンプレートに `col-*` が約 23 箇所。sticky の `top` が 5.5rem 固定                              | `layout/grid.css`、`sidebar.css:8`                         | CSS Grid                    | 1      | P5     |
| L-06 | 表のスタイルがグローバルに当たっていて、横スクロール用のラッパーが無い。モバイルではみ出す                                       | `main.css:287-306`                                         | WCAG 1.4.10                 | 2      | P3B/P5 |
| L-07 | Chroma がインラインスタイルを出力するため、コードブロックがダークモードに追従しない                                              | サイト `config.yaml` の `markup.highlight`                 | 一貫性                      | 2      | P7     |
| L-08 | 使われていないトークンとユーティリティが残っている（`--pochi-shadow-1`、`--pochi-surface`、`.u-focus-ring`）。`!important` が 18 | `tokens.css`、`utilities.css`                              | —                           | 1      | P2     |
| L-09 | いいね・シェアのレールが、目次のある記事にしか出ない                                                                             | `posts/single.html:9-17`                                   | 一貫性                      | 1      | P5     |

#### N: 情報設計・回遊

| ID   | 指摘                                                                          | 根拠                           | 基準・原則                          | 重大度 | Phase  |
| ---- | ----------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- | ------ | ------ |
| N-01 | 関連記事を `shuffle` しているため、ビルドごとに内容が変わる（VRT を阻害する） | `molecules/related_posts.html` | 予測可能性                          | 2      | P1     |
| N-02 | 読了時間・前後の記事・見出しアンカーが無い                                    | `organisms/content.html`       | Jakob の法則（Zenn / Qiita の慣習） | 2      | P6     |
| N-03 | 404 に回復導線（検索、最新記事）が無い                                        | `404.html`                     | Nielsen #9                          | 2      | P3B/P6 |
| N-04 | タグページに h1・件数・説明が無い                                             | `_default/list.html`           | 情報の匂い（information scent）     | 2      | P6     |
| N-05 | 検索結果が 0 件のときの案内が無い。Fuse を日本語向けに調整していない          | `main.js:293-424`              | Nielsen #9                          | 1      | P6     |
| N-06 | ナビで現在のセクションが分からない                                            | `nav.html`                     | Nielsen #1                          | 1      | P6     |

#### P: パフォーマンス・SEO

| ID   | 指摘                                                                                                                            | 根拠                                           | 基準・原則         | 重大度 | Phase |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ | ------ | ----- |
| P-01 | Markdown 画像の `sizes` が既定の 1200px / 100vw で、実際のカラム幅（約 670px）より大きい                                        | `atoms/picture.html:6`、`render-image.html`    | CWV（LCP・転送量） | 2      | P7    |
| P-02 | featuredImage から og:image を出力しておらず、`twitter:card` が `summary`                                                       | `head/head.html:47-48`                         | SNS での発見性     | 2      | P7    |
| P-03 | JSON-LD の問題：全ページを BlogPosting にしている、画像 URL が誤っている、廃止済みの SearchAction がある、BreadcrumbList が無い | `head/schema.html:10-11`                       | 構造化データ       | 2      | P7    |
| P-04 | `<title>` に改行が入っている。`shrink-to-fit` が残っている。RSS の `<link rel=alternate>` と `theme-color` が無い               | `head/meta.html:4-13`                          | —                  | 1      | P2/P7 |
| P-05 | Giscus を遅延読み込みしていない。AdSense の枠にスペースを予約していない（CLS）                                                  | `molecules/comment.html`、`molecules/ads.html` | CWV                | 2      | P7    |
| P-06 | 全ページにアイコンの SVG 一式（約 6.8KB）をインラインで埋め込んでいる                                                           | `molecules/icons.html`                         | パフォーマンス予算 | 1      | P7    |
| P-07 | 検索ページで結果を描画するとサイドバーが下にずれ、モバイルの CLS が 0.131 になる                                                | `_default/search.html`、`sidebar.css`          | CWV（CLS）         | 2      | P7    |

## Design policy

- 新しい色相やレイアウトパターンは追加しない。変えるのは仕組み・可読性・適合性だけにする。
- **安全網を先に作る**：計測と VRT を用意してから、基盤、見た目の順に変える。各 Phase は単独で出荷できる PR に分け、完了条件を持たせる。
- Baseline の「widely available」を基準にする。`light-dark()`、`text-autospace`、`word-break: auto-phrase` などの新しい機能は、非対応ブラウザで無視されても崩れない使い方（プログレッシブエンハンスメント）に限る。
- PJAX の契約を守る：`.main-content` は 1 つだけ。`syncHead()` は stylesheet を同期しないので、ページ種別ごとに CSS を分割しない。
- サイト設定の変更（`hasCJKLanguage`、`related`、Chroma の `noClasses`、CSP）はサイト側の PR で行う。テーマの変更は `make theme-pr` → `make theme-bump` で取り込み、CF Pages のプレビューで実環境を確認する。
- UI を変える PR には、before / after の VRT 差分を添付する。

### プロの道具箱（どの Phase で何を使うか）

| 区分             | 手法・理論                                                                                                              | ツール                                                                                                                  | Phase |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----- |
| 評価             | Nielsen の 10 ヒューリスティック（重大度 0〜4）、主要 4 タスクでの認知的ウォークスルー                                  | DevTools の CSS Overview / Coverage、Unlighthouse、PSI / CrUX、VoiceOver                                                | P0    |
| 回帰防止         | ベースライン固定、件数を増やさないラチェット運用                                                                        | Playwright の `toHaveScreenshot` / `toMatchAriaSnapshot`、`@axe-core/playwright`、html-validate、stylelint、`@lhci/cli` | P1    |
| デザインシステム | トークンの 3 層構造（primitive → semantic → component、W3C DTCG 準拠の命名）、`@layer` で ITCSS を実装、4pt グリッド    | OKLCH Picker、Adobe Leonardo、`stylelint-declaration-strict-value`                                                      | P2    |
| アクセシビリティ | WCAG 2.2 AA、補助指標としての APCA、Fitts の法則、W3C APG（Disclosure Navigation / Modal Dialog）、Inclusive Components | axe、colorjs.io、DevTools（forced-colors、色覚シミュレーション）                                                        | P3    |
| 和文タイポ       | JLREQ（行長 35〜40 字、行送り 175〜190%、禁則処理、和欧間アキ）、Utopia の流体タイプスケール、WCAG 1.4.4                | Utopia calculator、DevTools の Rendered Fonts、実機（mac / Win / iOS / Android）                                        | P4    |
| レイアウト       | CSS Grid の名前付きエリア、ゲシュタルト（近接・類同・共通領域）、コンテナクエリ                                         | DevTools の Grid オーバーレイ、VRT                                                                                      | P5    |
| 情報設計         | 情報の匂い（information scent）、Jakob の法則、Hick の法則                                                              | GA4、Search Console                                                                                                     | P6    |
| 性能・SEO        | Core Web Vitals の p75、RAIL、パフォーマンス予算、サードパーティの facade 化                                            | Lighthouse（`npm run lighthouse`）、WebPageTest、DevTools の Performance（INP）、Rich Results Test                      | P7    |

## Implementation steps

推奨する順序は **P0 → P1 → P2 → P3A → P3B → P3C → P4 → P5 → P6**。P7 は P1 の後なら並行して進められる（Chroma 対応だけは P2 の後）。P8 は任意。規模の目安は S（小）・M（中）・L（大）。

### P0 監査の確定とベースライン（S）— 本 PR

- 監査結果に ID を振り、ベースラインと一緒に本書へ記録する（上記）。
- Hugo と Node のバージョンをテーマの `mise.toml` に一本化し、CI（`ci.yml` / `e2e.yml`）は `jdx/mise-action` で読む。サイト側と同じ構成にする。
- 失敗し続けていた `deploy_to_github_page.yml` を削除する。存在しない `example_site` ブランチを checkout しようとしていて、GitHub Pages も未設定だった。
- example_site の非推奨キー `languageName` / `languageCode` を、それぞれ `label` / `locale` に移行する（Hugo 0.158 以降で警告が出る）。
- `AGENTS.md` と `README.md` に書かれた古いバージョン表記を直す。
- **完了条件**：ベースラインを記録してある。CI とローカルが同じ Hugo（0.164.0）でビルドできる。
- **残作業**：本番の PSI / CrUX の数値を取得したら、上の「ベースライン計測」表に追記する。

### P1 安全網（M・PR 3 本）

詳細は `2026-10-19_p1-safety-net.md`。当初の「`playwright.config.js` を projects で分ける」案は採らず、Docker 内で静的ビルドに対して走らせる `playwright.snapshot.config.js` を別に設ける（ベースラインを持つ VRT と a11y は Linux で固定する必要があるため）。

1. **PR1**：スタイルガイドページ（`example_site/content/page/styleguide/`）、出力の固定（関連記事の `shuffle` を廃止（N-01）、ビルド時にいいね API と年号を上書き）、VRT（42 枚、Docker）。
2. **PR2**：a11y（axe のラチェット、ランドマークと見出しのアウトライン）と静的チェック（html-validate、stylelint、コントラスト）。いずれもベースラインと完全一致させるラチェットで運用する。
3. **PR3**：Lighthouse の計測（静的ビルド、判定は warn のみ）。`@lhci/cli` は古い Lighthouse と脆弱な依存を引き込むので使わず、Lighthouse の Node API を直接呼ぶ `scripts/lighthouse.mjs` で回す。

- **あわせて実施**：main のブランチ保護（必須チェック）と、`@playwright/test` の更新を自動マージの対象から外す。
- **完了条件**：`--repeat-each=5` で VRT が一度も揺れない。CI の所要時間の増加が 5 分以内（ジョブは並列）。

### P2 トークン基盤とカスケード（M・見た目は変えない・PR 3 本）

詳細は `2026-10-20_p2-tokens-cascade.md`。PR A（未使用の削除・`main.css` の分割・ブレークポイント）→ PR B（トークン）→ PR C（`@layer`）の順に出す。VRT が写さない hover / focus の状態は、computed style を全要素で比べる `npm run style:diff` で確かめる。space / leading / font-size のトークンは、ルートの文字サイズを変える P4 で作る。

- `tokens.css` を primitive（oklch のランプ）と semantic（`light-dark()` + `color-scheme`）に分け、ダーク配色の重複を無くす（L-01、A-18）。radius / z / motion / focus-ring のトークンを追加する。
- `core/resources_css.html` で `resources.FromString` を使って `@layer` に包む。レイヤー順は `reset, tokens, base, layout, components, utilities`。`!important` は全件点検する。
- `main.css` を分割し、ツールチップとグラデーション見出しを共通化する（L-04）。ブレークポイントを range 構文の 3 段階に正規化する（L-03）。使っていないものを削除する（L-08）。
- `head/meta.html`：`color-scheme`、`theme-color` を追加し、`shrink-to-fit` を削除する（P-04 の一部）。
- **完了条件**：VRT の差分 0（ダークモードのスクロールバーとフォームだけは意図した差分）。色・z-index・radius の直書きが 0（stylelint でエラーにする）。バンドルサイズの変化が ±5% 以内。

### P3 WCAG 2.2 AA 準拠（3A / 3B / 3C は個別に出荷）

- **3A CSS**：A-01〜A-04、A-15〜A-17、T-06。リンク色を `#1f7a6d` 相当（5.17:1）にし、本文リンクに下線を付ける。アクセント上の文字は濃い色（8.48:1）にする。フォーカスは `:focus-visible` で統一し、`scroll-padding-top` を設定する。主要な操作対象は 44px 以上にする。`@media (hover: hover)` と reduced-motion をまとめて適用し、`forced-colors` にも対応する。
- **3B テンプレート**：A-05、A-06、A-09〜A-14、A-19〜A-21、L-06、N-03。全ページに h1 を置く。404 に回復導線を付ける。言語切替をリンクにする。ナビを disclosure パターンにする。カードは「`<h2><a>` + `::after` でクリック範囲を広げる」形にする。表の render hook を追加する。
- **3C JS**：A-07、A-08、A-22。サイドナビを `<dialog>` にする。テーマ切替を 3 状態にする。PJAX の遷移後に h1 へフォーカスを移し、live region でページ名を読み上げる。
- **完了条件**：axe の serious / critical が 0、html-validate のエラーが 0。トークンのペアが WCAG2 で 4.5 / 3 以上、かつ APCA で本文 Lc75 以上。操作できる要素が 24px 以上（自動で測る）。影響する E2E は同じ PR で更新する。

### P4 本文タイポグラフィ・和文組版（M）

- T-01〜T-05、T-07〜T-09 を対応する。ルートを `font-size: 100%` にする変更は単独の PR にし、before / after を添付する。本文は 16→17px、weight 400、line-height 1.8（単位なし）。
- フォントスタックを `:lang(ja)` / `:lang(en)` で出し分ける。ja は `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "BIZ UDPGothic", Meiryo, "Noto Sans JP", sans-serif`、mono は `ui-monospace` から始める。
- `line-break: strict`、`overflow-wrap: anywhere`、`text-autospace`、`text-wrap: pretty / balance`、見出しにだけ `palt`。本文の行長は `max-inline-size: 40em`。見出しのスケールは Utopia で作る。
- **完了条件**：font-size のトークンは 9 個以下。line-height は単位なしだけ。1 行の文字数（自動計測）が 1280px 幅で 36〜42 字、375px 幅で 20 字以上。320px 幅で横スクロールが出ない。

### P5 レイアウトとコンポーネント（M〜L）

- `layout/grid.css` を CSS Grid の `layout/shell.css` に置き換え、`col-*` を除去する（L-05）。`scrollspy.js` のセレクタは `data-pochi-toc` に移す。いいね・シェアのレールを常に表示する（L-09）。カードはコンテナクエリで組み、`aspect-ratio`・タグ表示・`line-clamp` を入れる。関連記事は auto-fill グリッドにする。
- **完了条件**：`grid.css`・`col-*`・`order` での並べ替えがゼロ。320〜1440px で横スクロールが出ない。カードの CLS が 0。

### P6 情報設計・回遊（M）

- N-02〜N-06 を対応する。`hasCJKLanguage: true` で読了時間を出す。前後の記事、見出しアンカー（render-heading フック）、`related` の重み付け、ナビの `aria-current`、タグページの h1・件数・説明、サイドバーの並び順、検索 0 件時の案内、Fuse の調整。
- **完了条件**：2 回ビルドしても関連記事が同じになる。GA4 で 28 日間のページ / セッションを比較し、+10% を目安にする。

### P7 パフォーマンス・SEO メタ（M・P1 以降なら並行して進められる）

- P-01〜P-06 と L-07 を対応する。`sizes` を実際のカラム幅に合わせる。og:image を生成して `summary_large_image` にする。JSON-LD を修正する。RSS の link を追加する。Giscus を lazy にし、AdSense の枠を予約する。Chroma の CSS をテーマに同梱してから、サイト側で `noClasses: false` に切り替える。CSP は Report-Only で始める（任意）。
- **完了条件**：`npm run lighthouse` で Perf ≥ 95、A11y = 100、BP ≥ 95、SEO = 100。gzip 後の予算は CSS ≤ 12KB、JS ≤ 25KB。フィールドデータは LCP ≤ 2.0s、INP ≤ 150ms、CLS ≤ 0.05。

### P8（任意・ADR）PJAX を廃止するかどうかの判断

- ドキュメント間の View Transitions と Speculation Rules の prerender で代替し、`navigation.js`（572 行）を削除できるか、スパイクで計測してから判断する。

## Risks and mitigations

- **VRT が不安定になる**：OS ごとのフォント差は Docker でベースラインを固定して避ける。フォントの見た目の判断は実機で行う。アニメーションは止め、lazy 画像は読み込みを待つ。関連記事のランダム表示は P1 でなくす。AdSense / GA / Giscus は CF Pages のプレビューで確認する。
- **PJAX の契約が崩れる**：live region とドロワーは `.main-content` の外に置く。新しく作る部品は `afterSwapInit` で再初期化する。ブラウザの戻る / 進むではフォーカスを移さない。
- **ダークモードの FOUC**：インラインスクリプトの位置は変えない。3 状態にした後も既存の `pref-theme` の値を読めるようにする。Giscus のテーマ同期を確認する。
- **ルートを 100% にすると影響が広い**：モバイルでは rem の寸法が約 14% 大きくなる。単独の PR にし、VRT でレビューする。
- **`@layer` で詳細度が変わる**：P2 の完了条件「VRT の差分 0」で検出する。
- **スコープが膨らむ**：識別性を保つガードレールと、各 Phase の完了条件で抑える。

## Validation

- `npm run lint`（P1 以降は stylelint、html-validate、コントラスト判定も含む）
- `npm run e2e`（既存の 28 spec）。P1 以降は `npm run vrt` と a11y の project も実行する。
- `npm run build`（example_site がビルドできること）。P1 以降は `npm run lighthouse` も実行する。
- 手動：スタイルガイドを実機（mac / Win / iOS / Android）で目視確認する。VoiceOver で主要 4 タスク（記事を探す、読む、次の記事に進む、テーマ / 言語を切り替える）を通す。キーボードだけで一周操作する。
- 本番：取り込み PR の CF Pages プレビューで、PSI / WebPageTest の before / after を比べる。マージから 28 日後に CrUX と GA4 を確認する。

## Decisions

- 2026-10-19：振れ幅は「磨き込み」。システムフォントを維持し、コードファーストで進める。
- 2026-10-19：Hugo / Node のバージョンはテーマの `mise.toml` で一元管理する（Hugo はサイト側と同じ 0.164.0、Node は 24）。
- 2026-10-19：動いていなかった GitHub Pages のデプロイワークフローを削除する。実環境の確認はサイト側の CF Pages プレビューで行う。
- CSS はページ種別ごとに分割しない（PJAX が stylesheet を同期しないため）。CSS Grid への移行は P5 で行う（VRT とトークンが揃った後）。
