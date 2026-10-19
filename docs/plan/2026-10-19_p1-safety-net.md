# Plan: P1 安全網（スタイルガイド・VRT・a11y・静的チェック・Lighthouse）

デザイン磨き込みロードマップ（`2026-10-19_design-refinement-roadmap.md`）の P1。P2 以降で見た目を変える前に、次の 3 つを用意する。

- 見た目の変化を検出する仕組み（VRT）
- 指摘件数を増やさない仕組み（ラチェット）
- 計測の土台

## Background

- 既存の品質ゲートは Prettier と Playwright E2E（hugo serve に対する機能テスト）だけ。見た目・a11y・HTML の妥当性・コントラスト・性能は自動では検出できない。
- main にブランチ保護が無く、Dependabot の PR は作成から約 12 秒でマージされていた。CI がゲートとして働いていない。
- example_site には、ビルドごとに出力が変わる要素がある：関連記事の `shuffle`、フッターの `now.Year`、いいね API（`localhost:9999`。E2E のフィクスチャの外ではコンソールエラーになる）。
- スクリーンショットはフォントと描画エンジンに依存するため、ベースラインの環境を 1 つに固定する必要がある。

## Current structure

- `playwright.config.js`：`tests/e2e` 専用。webServer は `hugo serve -s example_site ...`（ポート 10391）。
- `tests/e2e/fixtures.js`：`pageerror` と `console.error` でテストを失敗させ、`**/like?slug=*` をモックする。
- `layouts/partials/molecules/related_posts.html:5`：`.Site.RegularPages.Related $opts | shuffle | first 3`
- `layouts/partials/organisms/footer.html`：`.Site.Params.Copyright` があればそれを使い、無ければ `now.Year`。
- `assets/js/like-button.js:10-11`：`data-like-api` が空なら何もしない。
- `.github/dependabot.yml`：npm はすべて 1 グループ。`auto-merge.yml` はメジャー以外を自動承認し、自動マージする。
- `vendor_auto_update.yml`：`peter-evans/create-pull-request` を GITHUB_TOKEN で使っており、作成された PR では CI が起動しない。

## Design policy

- **実行環境**
  - VRT と a11y は `playwright.snapshot.config.js` で動かす。Docker（`mcr.microsoft.com/playwright:v<lock の版>-noble`、`--platform linux/amd64`）の中で静的ビルドに対して走らせ、ローカルと CI で同じスクリプト（`scripts/pw-docker.sh`）を使う。
  - 版は lockfile から読むので、Dependabot が Playwright を上げるとイメージのタグも追従する。
- **コンテナの依存**
  - 名前付きボリュームを `/work/node_modules` に重ね、コンテナ内で `npm ci --ignore-scripts` する。lock の sha が変わったときだけ実行する。
  - ホストの node_modules（mac 用）は使わない。テスト実行は `--network none`。
- **出力の固定**
  - `scripts/build-site.sh` の中だけで次の 3 つを設定する。E2E（hugo serve）には影響しない。
    - `TZ=UTC`
    - `HUGO_PARAMS_LIKEAPI_BASEURL=`（空。Hugo 0.164.0 ではキーが消え、`| default ""` で空になる）
    - `HUGO_PARAMS_COPYRIGHT`
  - ビルド後に grep で上書きが効いたかを検査する。
  - 関連記事は `shuffle` を外して `first 3` にする（`.Related` はスコア順、N-01）。
- **スタイルガイド**
  - `content/page/styleguide/index{,.ja}.md` に置く。
  - `type: posts`：記事レイアウトで描画させる。
  - `build: {list: never}`：一覧・index.json・関連記事に出さない。
  - `sitemap: {disable: true}`
  - md は `.prettierignore` に入れる（Prettier が日本語中の `*強調*` を `_強調_` に変えて強調が壊れるため）。
- **VRT**
  - 撮影は 42 枚。
  - `threshold: 0.02`、`maxDiffPixels: 0`、`retries: 0`。同じ環境で撮るので完全一致を求める。
  - 写真は `stylePath` で黒く塗りつぶし、PNG の容量を抑える。ベースラインは git に直接コミットする。
- **ラチェット（PR2）**
  - axe / html-validate / stylelint / コントラストの 4 つとも、ベースラインと完全一致させる。
  - 新規の違反や件数増は失敗。件数が減った場合も「`*:update` で締めて」と促す失敗にする。
- **Lighthouse（PR3）**
  - 判定はすべて warn。レポートはローカルの `.lighthouse/` と CI の artifact に残す（公開ストレージは使わない）。
  - 必須チェックにはしない。
  - 当初は Lighthouse CI（`@lhci/cli`）を使う予定だったが、Lighthouse の Node API を直接呼ぶ `scripts/lighthouse.mjs` に変えた。理由は Decisions を参照。

### VRT の撮影対象

| id          | URL                     | 375L | 768L | 1280L | 375D | 1280D |
| ----------- | ----------------------- | ---- | ---- | ----- | ---- | ----- |
| home        | `/`                     | ✓    | ✓    | ✓     | ✓    | ✓     |
| post-toc    | `/posts/p-03-with-toc/` | ✓    | ✓    | ✓     | ✓    | ✓     |
| about       | `/page/about/`          | ✓    | ✓    | ✓     | ✓    | ✓     |
| post-no-toc | `/posts/p-04-no-toc/`   | ✓    |      | ✓     | ✓    | ✓     |
| search      | `/search/?q=TOC`        | ✓    |      | ✓     |      | ✓     |
| archives    | `/archives/`            | ✓    |      | ✓     |      |       |
| tag         | `/tags/alpha/`          | ✓    |      | ✓     |      |       |
| 404         | `/404.html`             | ✓    |      | ✓     |      |       |
| ja-home     | `/ja/`                  | ✓    |      | ✓     |      |       |

上の 30 枚に加えて、スタイルガイド（`/ja/page/styleguide/`）を節ごとに撮る（12 枚）。

| 節        | 撮影条件                  |
| --------- | ------------------------- |
| sg-text   | 375L / 1280L / 1280D      |
| sg-table  | 375L / 1280L              |
| sg-code   | 375L / 1280L              |
| sg-blocks | 1280L / 1280D             |
| sg-tokens | 1280L / 1280D             |
| sg-media  | 1280L（実画像のまま撮る） |

ビューポートは 375×812、768×1024、1280×800。

## Implementation steps

### Step 0：ブランチ保護（実施済み）

- 2026-10-19、main に必須チェック（lint / build / vendor / e2e）を設定した。`strict: false`、`enforce_admins: false`、レビュー必須なし。
- 2026-10-19、PR1（#264）のマージ後に `vrt` を追加した。PR2 のマージ後に `a11y` を追加する。PUT は設定を丸ごと置き換えるので、毎回 check を全部列挙する。

### PR1 `chore/p1-styleguide-vrt`

1. 本書を作る。ロードマップの P1 節を更新する。
2. `related_posts.html` の `shuffle` を外す。
3. スタイルガイドとトークン見本の shortcode（`example_site/layouts/shortcodes/tokens.html`）を追加する。
4. 3 つのスクリプトを追加する。
   - `scripts/build-site.sh`
   - `scripts/serve-static.mjs`（依存なし。404 には `404.html` を返す。パストラバーサル対策あり）
   - `scripts/pw-docker.sh`
5. `playwright.snapshot.config.js` を追加する。`POCHI_PW_DOCKER` が無いか Linux 以外なら例外を投げ、mac の画素でベースラインが作られるのを防ぐ。
6. `tests/vrt/` を追加する（`helpers.js`、`pages.spec.js`、`styleguide.spec.js`、`screenshot.css`）。console.error の検出は `tests/e2e/fixtures.js` を再利用する。
7. npm scripts（`build:snapshot`、`vrt`、`vrt:update`）を追加し、`.gitignore` に `.snapshot/` を追加する。
8. `.github/workflows/snapshot.yml`（ジョブ `vrt`）を追加する。
   - 2 回ビルドして `diff -rq` を取り、出力が決定的であることを確かめる。
   - 失敗時は artifact を残す。
   - パスフィルタは付けない（必須チェックが来ないままになるため）。
9. Dependabot の npm グループを `playwright` → `quality-tools` → 既存の順に並べる。`auto-merge.yml` では `@playwright/test` を自動マージの対象から外す。
10. AGENTS.md を更新し、ベースラインを作成する。

### PR2 `chore/p1-a11y-static-checks`

- `scripts/lib/ratchet.cjs`（共通の比較とレポート）を追加する。
- a11y を追加する。
  - axe：13 ページ × 2 テーマ。ルールは wcag2a / 2aa / 21a / 21aa / 22aa と best-practice。
  - アウトライン：`ariaSnapshot()` からランドマークと見出しだけを抜き出す。
- stylelint を追加する。ルールは recommended に、strict-value・line-height の単位禁止・`!important` 禁止・色の直書き禁止を加える。件数は `rule[property]` 単位でラチェットする。
- コントラストを検査する。
  - postcss で `:root` と `:root.dark` を読む。
  - `var()`、`light-dark()`、`color-mix()` を解決し、alpha は合成してから計算する。
  - 判定は WCAG21。APCA は表示だけにする。
- html-validate を追加する。ルールごとの件数でラチェットする。
- CI：build ジョブに `lint:html` を、snapshot.yml に `a11y` ジョブを追加する。

### PR3 `chore/p1-lighthouse-ci`

- `lighthouse` と `chrome-launcher` を追加し、`scripts/lighthouse.mjs` と `scripts/lighthouse-targets.json` を作る。
  - 対象は 5 URL を各 3 回。run ごとに Chrome を起動し直し、Lighthouse の `computeMedianRun` で中央値の run を採る。
  - 判定はすべて warn：perf 0.95 / a11y 1 / bp 0.95 / seo 1、LCP 2500ms、CLS 0.05、CSS 12KB、JS 25KB、コンソールエラー 0。書き方は LHCI の assertions と同じ形にして、error にすると exit 1 になる。
  - Chrome は Playwright の Chromium（`CHROME_PATH` で上書きできる）。
- `serve-static.mjs` に `--gzip` を足す。
- `lighthouse.yml`（ジョブ `lighthouse`）を追加する。job summary に表を書き、レポートを artifact に残す。

## File changes

- 新規
  - `playwright.snapshot.config.js`
  - `scripts/{build-site.sh,serve-static.mjs,pw-docker.sh}`
  - `tests/vrt/`
  - `example_site/content/page/styleguide/`
  - `example_site/layouts/shortcodes/tokens.html`
  - `.github/workflows/snapshot.yml`
  - PR2・PR3 で `scripts/{check-contrast.mjs,lint-css.mjs,lint-html.mjs,lighthouse.mjs,lib/ratchet.cjs}`、`tests/{a11y,baselines}/`、`.stylelintrc.json`、`.htmlvalidate.json`、`scripts/lighthouse-targets.json`、`.github/workflows/lighthouse.yml`
- 変更
  - `layouts/partials/molecules/related_posts.html`
  - `package.json` / `package-lock.json`
  - `.gitignore` / `.prettierignore`
  - `.github/dependabot.yml`、`.github/workflows/{auto-merge,ci}.yml`
  - `AGENTS.md`、ロードマップ

## Risks and mitigations

- **VRT が揺れる**
  - 年と likeApi はビルド時に固定する。
  - reduced motion とアニメーション停止で動きを止める。
  - lazy 画像を eager にして decode を待つ。
  - ネットワークを遮断する。
  - `--repeat-each=5` を完了条件にする。
- **mac（Rosetta 上の amd64）と CI の画素差**
  - mac で作ったベースラインが CI で通ることを確かめる。
  - 差が出ても閾値は緩めない。CI でベースラインを生成し、artifact を取り込む方式に切り替える。
- **Playwright 更新 PR**
  - 自動マージの対象から外れ、必須チェックで止まる。
  - その PR のブランチで `npm run vrt:update` を実行し、差分を確認してから push する。
- **vendor 自動更新 PR**
  - CI が起動しないので必須チェックで止まる。管理者のバイパスで手動マージする。
  - 将来、App トークンで作成するように変えることを検討する。
- **リポジトリの肥大化**
  - 写真は黒く塗りつぶす。`--update-snapshots=changed` で、変わった画像だけを更新する。
  - 名前を変えて古くなった PNG は `git status` で見つけて消す。
- **パスフィルタが無いことによる CI 時間**
  - vrt と a11y は e2e と並列に走る。ドキュメントだけの PR でも走るが、許容する。

## Validation

- PR1
  - `npm run e2e`（既存 28 spec）。
  - `npm run build:snapshot` 後に次を確かめる。
    - `data-like-api=""` になっている。
    - styleguide が index.json に 0 件。
    - `/page/styleguide/` と `/ja/page/styleguide/` が生成されている。
  - 2 回ビルドして `diff -r` が空。
  - `npm run vrt -- --repeat-each=5` で一度も揺れない。
  - `du -sh tests/vrt/__snapshots__` が 10MB 以下。
  - 壊したら落ちることを確かめる（確かめた後は戻す）。
    - トークンの色を変える。
    - margin を +1px する。
    - `shuffle` を戻す。
    - ホストで snapshot config を直接実行する。
- PR2：`npm run lint`、`lint:html`、`a11y -- --repeat-each=3` が通る。各ラチェットについて、件数増・件数減・新規の違反を起こして落ちることを確かめる。
- PR3：`npm run lighthouse` がローカルと CI で exit 0。assertion を error にすると exit が 0 以外になる。

## Decisions

- 2026-10-19：example_site に `mainSections = ["posts"]` を明示した。未指定だと Hugo は「ページ数が最多のセクション」を自動で選ぶ。スタイルガイドを追加すると ja サイトで posts と page が 1 件ずつの同数になり、ビルドごとに選ばれるセクションが入れ替わって、`/ja/` と `/ja/archives/` の中身が変わっていた。6 回ビルドしても出力が一致することを確認した。
- 2026-10-19：VRT の感度を確認した。`--pochi-text` を `#424242` から `#4a4a4a` に変えるとライトモードの 30 枚が失敗し、記事カードの余白を 1px 増やすと一覧系の 10 枚が失敗した。最終的なベースラインで `--repeat-each=5` を実行し、210 件すべて成功した。
- 2026-10-19（PR2）：初期ベースラインは stylelint 183 件、html-validate 1129 件、axe 70 キー（107 ノード）、アウトライン 13 ページ。`a11y -- --repeat-each=3` で 120 件すべて成功した。負例（z-index と色の直書き、`!important` の削除、`--pochi-text-muted` を `#999` に、リンク色を `#1f7a6d` に、`:root.dark` だけの変更、id の重複、alt の削除、h3 → h4）でそれぞれ期待どおり失敗し、元に戻したことを確認した。
- 2026-10-19（PR2）：stylelint のキーでは、カスタムプロパティを `--*` にまとめた。変数名を変えただけでキーが動き、ラチェットが失敗するのを避けるため。
- 2026-10-19（PR2）：html-validate は minify なしのビルド（`.snapshot/html`）を検査し、行番号を読めるようにした。Hugo が出力する alias ページ（`/page/1/` などのリダイレクト）はテーマのテンプレートで描画していないので対象外にした。整形だけのルール（`attr-quotes` など 12 個）は off にした。
- 2026-10-19（PR2）：コントラスト検査で、ダークの `.u-focus-ring`（`--pochi-primary`）が 2.97:1 と分かり、ロードマップに A-24 として登録した。A-04 の teal はダークでも 4.46:1 で不合格。
- 2026-10-19（PR2）：`A11Y_UPDATE=1` のときは各テストが共有の `known-violations.json` を書き換えるので、`axe.spec.js` を 1 ワーカーで順番に実行する。通常は並列のまま。
- 2026-10-19（PR2）：追加した依存は、Dependabot の cooldown に合わせて公開から 14 日以上経った版にした。`npm audit` の high 7 件は stylelint が依存する `braces` 3.0.3 によるもの。3.0.3 が最新版で修正版が無く、開発時に自分の CSS に対してしか動かないので受け入れる。
- 2026-10-19（PR3）：Lighthouse CI（`@lhci/cli` 0.15.1、2025-06 公開が最新）は Lighthouse 12.6.1 に固定されていて、extract-zip のパストラバーサルや tmp・basic-ftp など high の脆弱性を 10 件以上持ち込む。Lighthouse 13.5.0 本体は依存 114 パッケージで脆弱性 0 件だったので、Node API を直接呼ぶ `scripts/lighthouse.mjs`（約 200 行）にした。LHCI から使うのは「中央値の run を選ぶ」と「assertion の書き方」だけで、前者は Lighthouse 同梱の `computeMedianRun` を使う。
- 2026-10-19（PR3）：example_site に `favicon`（`static/favicon.svg`）を設定した。未設定だとブラウザが `/favicon.ico` を取りに行き、その 404 が全ページで `errors-in-console` の警告になって、警告が常に出ている状態になるため。
- 2026-10-19（PR3）：初回の計測で、検索ページの CLS が 0.131（結果の描画でサイドバーが下にずれる）と分かり、ロードマップに P-07 として登録した。ほかの 4 ページは 4 カテゴリとも 100。

## Open questions

- 件数が減ったときもラチェットを失敗にする運用が重い場合は、「件数減は warn」に緩める。
- vendor 自動更新 PR を App トークンで作成し、CI を起動させるかどうか。
