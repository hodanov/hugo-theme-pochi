# Investigation Memory

## Codebase Patterns

- CSS bundle is assembled in `layouts/partials/core/resources_css.html` via `resources.Concat` → load order is deterministic and matters for cascade resolution
- Dark mode uses `.dark` class on `<html>` (manual JS toggle), NOT `prefers-color-scheme` media query. FOUC mitigation is done via inline `<script>` in `head.html:50-65` that runs before CSS loads — this is intentional and partially effective
- Token variables live in `tokens.css` `:root` and `:root.dark`; dark-mode `.dark` selector overrides scattered across `main.css` and component files create dual-management
- `--pochi-accent: #79c6b6` is used as both link text color AND border/background accent — contrast ratio is too low (~2.5:1) for text use on white
- `forms.css:39-41` removes focus outline for all `textarea:focus, input:focus` — no `focus-visible` counterpart, WCAG 2.4.7 violation
- `nav.css:53-55` removes focus outline for `#menu-bar-btn:focus`, but `nav.css:56-59` adds `focus-visible` outline — partially mitigated
- Bootstrap Reboot was replaced with modern-normalize as of commit `ecccb7e` — the `assets/scss/reboot.scss` stale memory entry should be ignored
- AdSense は二経路で読み込まれる: (1) `google_adsense.html` が `GoogleAdsenseID` から `<script async>` を head に出力、(2) `ads.html` が `GoogleAdsenseCode` (インライン文字列) を `safeHTML` で article 下部に出力。後者は `<script async>` + `<ins>` + `<script>push</script>` を含む完全なコードブロック
- PJAX (navigation.js) は `adoptImagePreloads()` でページ遷移時に `link[rel="preload"][as="image"]` を動的差し替えする高度な仕組みを持つが、初回 SSR では `head.html` に preload ヒントが一切出力されない
- `lineNos: true` + `lineNumbersInTable: false` の組み合わせはインライン span 方式でシンタックスハイライト行番号を出力 → コードブロックが多い記事でDOMノード数が増大する

## Key Files

- `assets/css/tokens.css`: Design token definitions, `:root` (light) and `:root.dark`
- `assets/css/main.css`: Main stylesheet — `transition: all` + `overflow:hidden` applied globally to `a` element at lines 91-103; IE comment at 327-329; `!important` at line 342; `widget_categories` (lines 165-194) / `category-page` (line 197) / `alignleft` (line 321) セレクタはテンプレートで未使用のデッドコード
- `assets/css/base.css`: Box-sizing reset + skip-link + `body { font-family }` (line 14-16) — duplicates `main.css:12` declaration
- `assets/css/components/typography.css`: Article heading scale with `clamp()`; `h1,h2` global gets `clamp(2rem,4vw,3.2rem)` at line 13-16 but no `line-height` override (inherits body value)
- `assets/css/components/hero.css`: Parallax container — `.parallax-container { height: calc(61.8vh - var(--pochi-nav-height)) }` (valid); `.hero { position: fixed }` でパララックス実装; モバイル 40vh ブレークポイントは 1280px
- `assets/css/components/forms.css`: `outline:none` on all focus — a11y issue
- `assets/css/components/nav.css`: Float-based layout for nav items (lines 37,64,127,137); `transition: all` on nav `li a` at line 144; `transition: all` on side-nav and dropdown-list
- `assets/css/components/article-list.css`: `float:left` on `.post-image-col` at line 17 — old float layout
- `assets/css/components/sidebar.css`: CSS `content: "URLをコピーしました"` hardcoded Japanese at lines 172 and 273 — cannot be i18n'd without attr() or JS approach
- `assets/css/components/toc.css`: TOC styles — article 内インライン TOC (`.table-of-contents`) + サイドバー TOC 両対応。全ページに読み込まれるが TOC がない記事でも影響なし
- `assets/css/components/search.css`: 検索フォームのみ対象。26ファイル束に含まれるが search ページ以外では DOM にそのセレクタが存在しない
- `layouts/partials/core/resources_css.html`: 26 ファイルを 1 bundle (minify + fingerprint) → 全ページ同一 CSS 配信。per-page 分割なし
- `layouts/partials/core/resources_js.html`: main.js + navigation.js + archives-toggle.js + scrollspy.js + like-button.js + share-button.js + lang-switcher.js を 1 bundle → 全ページ `defer` で配信
- `layouts/partials/core/resources_search_js.html`: fuse.js + mark.js を `search.html` のみでロード — search ページ限定は正しく実装済み
- `layouts/partials/atoms/picture.html`: `priority="high"` 時に `fetchpriority="high"` + `loading="eager"` を出力。preload ヒントは head 側に出力しない
- `layouts/partials/molecules/hero.html`: `featuredImageAlt | default .Title` で alt 修正済み (line 6); widths: [480,800,1200,1600,2000,2400]; priority="high"
- `layouts/partials/molecules/post_meta_featured_image.html`: `alt="featured image"` hardcoded at line 7; `$page.Title` available
- `layouts/partials/molecules/related_posts.html`: `featuredImageAlt | default $page.Title` で alt 修正済み (line 19); `.Site.RegularPages.Related` + shuffle + first 3 パターン
- `layouts/partials/organisms/list_of_posts.html`: `alt="featured image"` hardcoded at line 15; `$page.Title` is in scope
- `layouts/partials/organisms/content.html`: article ページのコンテンツ構造 — ads.html は line 18 で呼ばれる
- `layouts/partials/head/google_adsense.html`: `GoogleAdsenseID` が設定されかつ `.IsPage` かつ main sections に含まれる場合のみ `<script async>` を head に出力 (line 4-10)
- `layouts/partials/molecules/ads.html`: `GoogleAdsenseCode` (インライン文字列) を `safeHTML` で出力 (line 1-9) — 二重ロードの原因
- `layouts/_default/terms.html`: `<ul>` inside `{{ range }}` at line 8 — generates one `<ul>` per term instead of wrapping all `<li>` in one `<ul>`
- `layouts/_default/baseof.html`: `<head prefix>` は現在存在しない（修正済み）
- `layouts/partials/molecules/breadcrumbs.html`: `<ul>` not wrapped in `<nav aria-label="Breadcrumb">` (line 3); no BreadcrumbList JSON-LD
- `layouts/partials/molecules/nav.html`: `<nav class="site-nav">` at line 2 has no `aria-label`; page also has `nav#TableOfContents` — two unlabeled nav landmarks
- `layouts/partials/molecules/lang_switcher.html`: `lang-switcher.js` は document-level イベント委譲で実装 (line 3) — PJAX 後もバインド不要
- `layouts/partials/molecules/like_button.html`: `title="いいね"` hardcoded Japanese at line 8 — no `{{ T }}` call
- `layouts/partials/molecules/share_button.html`: `title="URLをコピー"` hardcoded Japanese at line 6 — no `{{ T }}` call
- `layouts/partials/head/schema.html`: Has BlogPosting JSON-LD but NO BreadcrumbList schema — breadcrumbs page separate issue
- `layouts/partials/head/head.html`: Dark mode init script at lines 50-65; preload ヒント (`<link rel="preload" as="image">`) の出力コードが一切ない
- `assets/js/main.js`: `initSearch()` at line 283 — `inputBox` null check で早期 return するため非 search ページでのコストは最小; `populateResults` at line 352 — `searchResults.innerHTML += output` at line 375; `render()` at line 390 calls `escapeHtml()` for data substitution (XSS mitigation present)
- `assets/js/navigation.js`: PJAX 実装 — `adoptImagePreloads()` (line 182-239) が PJAX 遷移時に preload ヒントを動的差し替え; `afterSwapInit()` (line 318-418) が AdSense + Giscus を PJAX 後に再初期化
- `assets/js/like-button.js`: IIFE 内で `[data-like-button]` 要素がなければ早期 return
- `assets/js/share-button.js`: IIFE 内で share ボタン DOM がなければ早期 return
- `assets/js/lang-switcher.js`: document-level change イベント委譲 (16行) — 全ページで付与されるが軽量
- `i18n/en.toml` and `i18n/ja.toml`: Missing keys `like`, `copy_url` (would be needed for i18n of like/share buttons)
- `hugo/config/_default/config.yaml`: `markup.highlight.lineNos: true`, `lineNumbersInTable: false` — インライン span 方式でコード行番号出力; `noClasses` 設定なし (Hugo 既定は Chroma インライン style を使うが、`style: native` が設定されているので `noClasses` が false の場合はインライン属性なしでクラスベース)

- `picture.html` has 3 rendering paths: (1) JPG/PNG source → AVIF/WEBP via image processing (q75 webp, q60 avif); (2) AVIF/WEBP source + sidecar JPG/PNG → resize from sidecar (q65 primary, q80 jpg fallback); (3) AVIF/WEBP source without sidecar → single `<source>`, no responsive srcset. `preload_lcp_image.html` currently only mirrors Path 1 and skips AVIF/WEBP sources entirely (`$skip` at line 4).
- `picture.html:112-116,169-173,189-193,209-213,257-261,281-285`: `loading` attribute output uses multi-line Hugo template syntax → actual HTML output is `loading="\n        eager\n      "` with surrounding whitespace. HTML spec requires attribute value trimming for content attributes but the visible whitespace in minified output may vary; in practice browsers treat it correctly but minification is affected.
- `preload_lcp_image.html:7-8`: `$isPost` branch uses `slice 480 800 1200 1600` for posts, `slice 480 800 1200 1600 2000 2400` for non-posts. `post_meta_featured_image.html` passes `widths (slice 480 800 1200 1600)` for posts section — this matches. `hero.html` passes `widths (slice 480 800 1200 1600 2000 2400)` for non-posts — this matches. The `$isPost`/`sizes` split in preload is correctly aligned with the two calling templates.
- `preload_lcp_image.html:8`: JPG/PNG path `$sizes` is hardcoded to `(min-width: 1200px) 1200px, 100vw` regardless of `$isPost` in the sidecar-path plan proposal (lines 79,107,116). But the current code uses `$isPost` properly for JPG/PNG. The plan doc proposal at line 79/107/116 loses the `$isPost` differentiation for the sidecar path (posts vs. non-posts both get `1200px` breakpoint).

## Past Findings

### 2026-03-23: CSS architecture audit (pochi Hugo theme)

- Dark mode is dual-managed: `tokens.css :root.dark` sets CSS variables correctly, but `main.css` adds 53 `.dark` class selectors that re-apply the same variables to specific elements. The variable-only approach in tokens.css is sufficient for background/text color; the `.dark` selectors are only needed for structural differences (gradient directions, shadow variants, icon visibility).
- `--pochi-accent` (#79c6b6) is used as link `color` in `typography.css:65` and throughout sidebars/footers — estimated contrast ~2.5:1 vs white, fails WCAG AA. No dark-mode override for accent.
- `forms.css` focus issue: only `outline:none`, no `focus-visible` equivalent. `nav.css` has a partial fix (menu-bar-btn has focus-visible), but lang-switcher select and side-nav-close use `:focus` with visible outline (not suppressed), so those are safe.
- Cascade conflict for `article h1-h3`: `main.css` sets fixed px sizes (1.75rem–2rem), `typography.css` sets `clamp()` sizes. Since `typography.css` loads before `main.css` in the bundle, `main.css` wins — **UPDATE: as of commit 74b63e9 this was refactored; typography.css now owns article heading clamp() and it's confirmed active**.

### 2026-03-25: Design/UX improvement audit (pochi Hugo theme)

- **alt text (WCAG 1.1.1)**: hero.html and related_posts.html are NOW FIXED (both use `featuredImageAlt | default .Title`). Remaining: `post_meta_featured_image.html:7` and `list_of_posts.html:15` still hardcode `alt="featured image"`.
- **terms.html `<ul>` nesting**: Confirmed at line 8 — `<ul>` is inside `{{ range }}`, generates one list per term. Simple fix: move `<ul>` outside range, keep `<li>` inside.
- **`transition: all` + `overflow: hidden` on `a`**: Confirmed at `main.css:91-103`. The `overflow:hidden` on all `a` elements is the higher practical risk (text clipping). `transition:all` also hits nav `li a` at `nav.css:144` and dropdown/side-nav at `nav.css:197,242`.
- **breadcrumbs accessibility**: `breadcrumbs.html` has bare `<ul>` with no `<nav>` wrapper and no aria-label; also uses `<ul>` (unordered) instead of `<ol>` (ordered) which is more semantically correct for breadcrumbs. No BreadcrumbList JSON-LD in schema.html.
- **nav `aria-label` missing**: `nav.html:2` has `<nav class="site-nav">` with no aria-label. TOC is `nav#TableOfContents` (also no aria-label). Two unlabeled nav landmarks on article pages.
- **`<head prefix>` deprecated**: NOW FIXED — baseof.html no longer has prefix attribute.
- **`body font-family` duplication**: `base.css:14-16` and `main.css:12` both declare `body { font-family: var(--pochi-font-base); }`. `main.css` wins (loads later). `base.css` declaration is redundant.
- **`font-weight: 300`**: Confirmed at `main.css:13` — Light weight on body. Japanese on Windows/Meiryo may render incorrectly.
- **float layouts**: `article-list.css:17` (`float:left` on `.post-image-col`); `nav.css:37,64,127,137` (multiple float declarations in nav).
- **XSS in search**: `main.js` render() calls `escapeHtml()` for variable substitution — XSS is mitigated. `innerHTML +=` pattern remains (incremental DOM append), not a security issue per se but has reflow cost.
- **like/share i18n**: `like_button.html:8` `title="いいね"` and `share_button.html:6` `title="URLをコピー"` are hardcoded. i18n keys `like` and `copy_url` don't exist in either toml — both template and i18n files need updating. CSS `content: "URLをコピーしました"` at `sidebar.css:172,273` cannot use Hugo i18n — needs JS or `attr(data-*)` approach.
- **lang_switcher CSP**: `lang-switcher.js` was refactored to use document-level `change` event delegation — no inline `onchange` in HTML anymore.
- **FOUC for dark mode**: head.html inline script runs before CSS. When JS is disabled, no dark mode at all. `@media (prefers-color-scheme: dark)` in CSS would serve JS-disabled users correctly.

### 2026-03-27: Image rendering / preload refactor audit (pochi Hugo theme)

- **picture.html has 3 paths with divergent quality values**: Path 1 (JPG/PNG source, lines 46-122): webp q75, avif q60. Path 2 (AVIF/WEBP+sidecar, lines 123-179): q65 primary, q80 jpg fallback. Path 3 (lines 202-294): static/fallback, no responsive srcset. Paths 1 and 2 share identical `<img>` attribute block (loading/fetchpriority/decoding/width/height) repeated 5 times across the file.
- **`loading` attribute whitespace**: `loading="{{ if eq $priority "high" }}\n  eager\n{{ else }}\n  lazy\n{{ end }}"` produces attribute values with leading/trailing whitespace at lines 112-116, 169-173, 189-193, 209-213, 257-261, 281-285. Browsers handle it (HTML spec trims), but minifiers may or may not collapse it.
- **preload path-2 gap (confirmed unimplemented)**: `preload_lcp_image.html:4` has `$skip := or (eq $ext ".svg") (eq $ext ".svgz") (eq $ext ".avif") (eq $ext ".webp")` — AVIF/WEBP featuredImages produce no preload hint even when sidecar JPG/PNG exists. The plan in `docs/plan/2026-03-27_add-sidecar-preload-path.md` is not yet applied.
- **double preload (AVIF+WEBP) confirmed in previous code**: Addressed in `docs/plan/2026-03-27_fix-double-preload.md`. Current `preload_lcp_image.html:26-44` uses `else if` correctly — this fix IS already applied.
- **preload `sizes` alignment**: `preload_lcp_image.html` correctly uses `$isPost` to set `sizes` and `widths` for JPG/PNG path. The `post_meta_featured_image.html` (posts section) uses `widths (slice 480 800 1200 1600)` and `sizes "(min-width: 800px) 800px, 100vw"` — matches. `hero.html` (default single) uses `widths (slice 480 800 1200 1600 2000 2400)` and `sizes "(min-width: 1200px) 1200px, 100vw"` — matches. Alignment is correct.
- **caller inventory for picture.html**: (1) `hero.html` — non-posts single, widths [480,800,1200,1600,2000,2400], sizes 1200px breakpoint, priority high; (2) `post_meta_featured_image.html` — posts single, widths [480,800,1200,1600], sizes 800px breakpoint, priority high; (3) `list_of_posts.html` — list pages, widths [480,800], sizes 480px breakpoint, priority conditional; (4) `related_posts.html` — article foot, widths [320,640], sizes 320px breakpoint, no priority; (5) `render-image.html` — markdown inline images, no widths/sizes/priority (all defaults); (6) `profile.html` — sidebar avatar, no widths/sizes/priority (all defaults).
- **Refactor opportunities confirmed**: (A) Extract `<img>` attribute block into a sub-partial `atoms/img_attrs.html` called from all 5 locations in picture.html. (B) Centralize quality values in `site.Params.images` (`webpQuality`, `avifQuality`, `sidecarQuality`, `sidecarFallbackQuality`). (C) Extract `bounded-widths` computation (lines 50-58 and 133-141) into a reusable pattern or named sub-partial. (D) `preload_lcp_image.html` should become a thin wrapper that re-uses the same bounds+quality logic as picture.html. Hugo partials cannot return values, so the shared logic must either be duplicated with a comment pointing to the source, or the preload partial can call picture.html in a "dry run" mode via a `preload=true` dict flag — but Hugo partials always produce HTML output, so the dry-run approach is not viable. Best option: document quality constants in `site.Params.images` and enforce via code comments.

### 2026-03-25: Performance audit (pochi Hugo theme)

- **LCP preload gap**: `head.html` outputs NO `<link rel="preload" as="image">` for SSR. `picture.html` sets `fetchpriority="high"` + `loading="eager"` on the `<img>` tag for priority="high" images, which helps the browser prioritize after parsing the `<picture>` element, but the resource is not discovered until the parser reaches it in `<body>`. `navigation.js:182-239` (`adoptImagePreloads()`) handles preload injection for PJAX-navigated pages only.
- **AdSense double-load confirmed**: On article pages in main sections with both params configured, AdSense JS loads twice: once via `google_adsense.html` (head, `<script async src="...adsbygoogle.js?client=ca-pub-XXX">`), and once via `ads.html` (body, `GoogleAdsenseCode` string which also contains `<script async src="...adsbygoogle.js?client=ca-pub-XXX">`). `navigation.js:326-384` also dynamically re-injects AdSense script after PJAX swaps, checking `hasLoader` to avoid triple-load.
- **CSS bundle no-split**: 26 CSS files always bundled as one. `search.css` (25 lines), `scroll.css`, `toc.css` are always sent even to pages that never show those components. Total bundle size is small (each component is <150 lines) so split is low priority. fingerprint + long cache headers is the correct mitigation.
- **JS bundle**: `like-button.js`, `share-button.js` have IIFE early-return guards. `lang-switcher.js` uses document-level delegation (16 lines, negligible). All 7 files bundled together, but each guards itself against missing DOM. `scrollspy.js` runs on all pages — worth checking if it no-ops on non-article pages.
- **Dead CSS confirmed**: `main.css:165-194` (`.widget_categories`), `main.css:197-206` (`.category-page`), `main.css:321-330` (`.alignleft`/`.alignright`) — grep across all layouts returns zero matches. Safe to delete.
- **lineNos: true + lineNumbersInTable: false**: Confirmed in `config.yaml:49-50`. This combination uses inline span method for line numbers. Hugo's Chroma renderer wraps each line in a `<span class="ln">` inside the `<code>`, adding ~1 extra DOM node per line. For a 200-line code block: ~200 extra `<span>` nodes. `lineNumbersInTable: true` would use a separate `<td>` column (reduces main content span count but increases table structure). Impact is real but only on code-heavy posts.
- **hero.css: no broken calc** — `hero.css` was updated; current version uses `calc(61.8vh - var(--pochi-nav-height))` which is valid (no missing unit).
- **related_posts.html**: `.Site.RegularPages.Related` is a Hugo built-in that lazily computes the related content index on first call and caches it. `shuffle` runs at build time on the result set, not at runtime. No runtime performance concern; build-time cost is bounded by total page count.
