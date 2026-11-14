# Plan: P6 情報設計・回遊

デザイン磨き込みロードマップ（`2026-10-19_design-refinement-roadmap.md`）の P6。P5 でレイアウトとカードが揃ったので、記事を読み終えた人と探している人が次の記事にたどり着ける導線を足す。

## Background

- 対象の監査 ID：N-02（読了時間・前後の記事・見出しアンカーが無い）、N-04（タグページに件数・説明が無い）、N-05（検索 0 件の案内、Fuse を和文向けに調整していない）、N-06（ナビで現在のセクションが分からない）。N-03（404 の回復導線）は P3B で済んでいる。
- ロードマップで決めてあること：`hasCJKLanguage: true` で読了時間を出す。前後の記事、見出しアンカー（render-heading フック）、`related` の重み付け、ナビの `aria-current`、タグページの h1・件数・説明、サイドバーの並び順、検索 0 件の案内、Fuse の調整。
- 完了条件：2 回ビルドしても関連記事が同じ。GA4 で 28 日間のページ / セッションを比べ、+10% を目安にする（取り込み後に見る）。
- 2026-11-14 にユーザーと決めたこと：
  - 前後の記事は本文の直後（本文 → 前後の記事 → コメント → 関連記事）。
  - 見出しアンカーは `#` を見出しの横に置き、ホバーとフォーカスのときだけ見せる。
  - 読了時間は出さない（6A で作ったあと、ユーザーと決めて外した。Decisions を参照）。
  - モバイルでもカテゴリとアーカイブを出す（今は 768px 未満で `#sidebar-left` を隠している）。

## Current structure

棚卸し（2026-11-14、main = 61bc2c0）：

- 記事（`organisms/content.html`）：タグ → h1 → 日付（`molecules/post_meta_date.html`。カードと共用）→ アイキャッチ → 目次 → 本文 → コメント → 関連記事 → 広告。読了時間・前後の記事は無い。
- 見出し：Goldmark が id を付けるだけで、render-heading フックは無い。見出しの CSS は `typography.css` と `article.css`（`article h2` などの子孫セレクタだけで、隣接や子のセレクタは無い）。
- ナビ（`molecules/nav.html`・`side_nav.html`）：`aria-current` が無い。PJAX は `syncHeaderUI()` で `#menu-global-nav` と `#menu-global-nav-for-phone` を次のページの HTML で差し替えるので、テンプレートで付ければ遷移後も合う。
- タグページ（`_default/list.html`）：h1 はある。件数・説明は無い。
- 検索（`main.js`）：0 件のときは「一致する結果はありません」の 1 行だけ。Fuse は `location: 0, distance: 100` の既定で、本文の 100 字目より後ろにある語はほぼ当たらない。
- 関連記事（`molecules/related_posts.html`）：`indices: tags` の上位 3 件。hodalog は `related` を設定しておらず、Hugo の既定（`includeNewer: false`）で新しい記事が出ない。

## Design policy

### PR の分け方

1. **6A 記事の回遊**（`feat/p6a-post-navigation`）：N-02。前後の記事、見出しアンカー。
2. **6B 一覧とナビ**（`feat/p6b-list-nav`）：N-04、N-06、サイドバーの並び。
3. **6C 検索と関連記事**（`feat/p6c-search-related`）：N-05、`related` の重み付け。

サイト側（hodalog）は、テーマの取り込み PR で `related` の設定を足す。

### 記事の回遊（6A）

- 前後の記事：`molecules/post_nav.html`。`<nav aria-label="前後の記事">` の中に、古い記事（「前の記事」、`rel="prev"`）と新しい記事（「次の記事」、`rel="next"`）のリンクを題つきで置く。範囲は同じセクション（`.PrevInSection` / `.NextInSection`）。端の記事は片方だけ出す。
- 見出しアンカー：`_default/_markup/render-heading.html`。見出しと、その後ろのリンクを `div.heading-anchor-wrapper` で包む（GitHub と同じ形）。リンクは見出しの外にあるので、見出しの名前は今のまま変わらない。リンクの名前は「見出しへのリンク：<見出し>」。見た目の `#` は `aria-hidden`。`#` は見出しの左の余白に置き、ホバーとフォーカスのときだけ見せる。包む div は装飾の無いブロックなので、見出しのマージンの相殺は今と同じ。

### 一覧とナビ（6B）

- タグ・カテゴリのページ（`.Kind` が `term`）：h1 の下に件数（「3 件の記事」/「3 posts」。英語は単数形も）と、`_index.md` の `description` を出す。セクションの一覧には出さない。
- ナビの現在地：`helpers/menu_current.html` が、メニューの項目とページの関係を `aria-current` の値で返す。項目がページそのものなら `page`、ページがその下にある（URL が前方一致する、ページの最初のセクションと同じ、子の項目が現在地）なら `true`。`/`（ホーム）は完全一致だけ。URL で比べるので、hodalog のように `url` で書いたメニューにも効く（hodalog の記事は `/:slug` だが、最初のセクションが `/posts/` なので「ブログ」が `true` になる）。上部のメニューと横から出るメニューの両方に付ける。PJAX は `syncHeaderUI()` でメニューを差し替えるので、遷移後も合う。
- 見た目：リンクの色と、アクセントの線（上部は下に 3px、横のメニューは左に 4px）。強制カラーでは下線にする。色の指定は `:where()` で重さを上げず、ホバーの配色が勝つようにする。
- モバイル（768px 未満）：一覧のページでは `#sidebar-left`（カテゴリ・アーカイブ）を隠さず、記事の一覧の後ろに出す。記事のページのレール（いいね・シェア）は今までどおり隠す（下のアクションバーに同じボタンがある）。

## File changes

- 6A の新規：本書、`layouts/_default/_markup/render-heading.html`、`layouts/partials/molecules/post_nav.html`、`assets/css/components/post-nav.css`、`tests/e2e/f-21-post-navigation.spec.js`
- 6A の変更：`organisms/content.html`、`core/resources_css.html`、`article.css`、`main.js`、`i18n/{en,ja}.toml`、`tests/a11y/measure.spec.js`、VRT・outline のベースライン、`AGENTS.md`、ロードマップ

- 6B の新規：`layouts/partials/helpers/menu_current.html`、`example_site/content/tags/alpha/_index.md`
- 6B の変更：`_default/list.html`、`molecules/{nav,side_nav}.html`、`nav.css`、`sidebar.css`、`article-list.css`、`i18n/{en,ja}.toml`、e2e（f-01・p-01・p-09）、VRT・outline のベースライン、ロードマップ

## Risks and mitigations

- **見出しの見た目が変わる**：包む div が見出しのマージンや `article h2` の罫線に影響しないことを、記事の VRT で確かめる（ホバーしないので `#` は写らない）。
- **PJAX**：前後の記事のリンクは `.main-content` の中なので、遷移で入れ替わる。内部リンクとして PJAX で遷移することを f-12 の流れで確かめる。

## Validation

- 各 PR：`npm run lint`、`lint:html`、`a11y`、`vrt`、`e2e`、`lighthouse`。
- 6A の e2e：前後の記事のリンクの向きと題。端の記事で片方だけ。見出しのリンクが見出しの id を指し、フォーカスで見える。
- 6B の e2e：タグページの件数（単数・複数・ja）と説明、セクションには出ないこと。ナビの `aria-current`（ホーム・固定ページ・子のページ・記事・横のメニュー・PJAX の後）と、現在地の見た目がほかと違うこと。375px のホームでカテゴリとアーカイブが記事の後ろに見え、記事ではレールが隠れること。

## Decisions

- 2026-11-14：計画をユーザーと確認した（前後の記事の位置、見出しアンカーの見せ方、読了時間の位置、モバイルのサイドバー）。
- 2026-11-14（6A）：f-21 の e2e（前後の記事の向きと位置、端の記事、見出しのリンク）を先に足し、main で落ちることを確かめてから作った。Hugo の `NextInSection` は新しい記事の方なので、`PrevInSection` を「前の記事」（古い方）にした。
- 2026-11-14（6A）：ページ内リンクは URL のハッシュを変えない作り（`location.hash` を変えると popstate が起き、PJAX が読み直す）。見出しのリンクは URL を渡すためのものなので、これだけ `history.replaceState` でアドレスバーに入れる（popstate は起きない）。
- 2026-11-14（6A）：見出しを包む div は、包まないとき（`display: contents` で比べた）と位置も高さも同じ。ただ `position: relative` で見出しの文字のアンチエイリアスがわずかに変わり、スタイルガイドの 1280px の VRT に出た（`position: static` にすると消えることを確かめた）。見た目では分からないので受け入れた。`measure.spec` の `#sg-text ~ p` は包む div で切れるので `.heading-anchor-wrapper:has(#sg-text) ~ p` にした。
- 2026-11-14（6A）：読了時間は一度作ったが外した（ユーザーと決めた）。Hugo の `.ReadingTime` は和文 500 字 / 分・英文 213 語 / 分の固定の速さで割るだけで、コードブロックも同じ速さで数える。読む速さは人によって 2 倍ほど違い、技術記事では知っている所を飛ばすので、出る値は「短いか長いか」の目安にしかならない。その割に日付の行の情報が増え、読み手の負荷になる。あわせて `hasCJKLanguage` も足さない（hodalog でも要らない）。
- 2026-11-14（6B）：e2e を先に足し、main で 11 本が落ちることを確かめてから作った。
- 2026-11-14（6B）：計画の相談では、モバイルの並びを「検索 → カテゴリ → アーカイブ → プロフィール」と書いたが、DOM の順（本文 → `#sidebar-left` → `#sidebar`）のまま「カテゴリ → アーカイブ → 検索 → プロフィール」にした。検索を前に出すには `#sidebar` を二つに割るか、`order` / grid の並べ替え（見た目と Tab の順がずれる。P5 で禁止にした）が要るため。
- 2026-11-14（6B）：ダークで「現在地」の項目にホバーすると、`a[aria-current]` の色がホバーの文字色に勝ち、アクセントの背景の上で読めなくなった。色の指定を `a:where([aria-current])` にして重さをふつうのリンクと同じにした。
