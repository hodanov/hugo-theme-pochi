# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pochi is a Hugo theme for the hodalog.com blog. It supports light/dark mode, client-side search (Fuse.js + Mark.js), PJAX navigation, i18n (ja/en), like button (external API), and Giscus comments. Hugo minimum version: 0.158.0 (`theme.toml`).

## Build & Development Commands

Hugo and Node versions are pinned in `mise.toml` (single source of truth for local dev and CI; keep Hugo in sync with the site repo). Run `mise install` before the commands below.

```bash
npm ci                      # Install dependencies
npm run vendor:sync          # Copy Fuse/Mark/normalize into assets/js/vendor/ (required after npm ci)
npm run serve                # Dev server with live reload via example_site
npm run build                # Production-like build of example_site
npm run lint                 # Prettier check + stylelint and contrast ratchets
npm run lint:css             # stylelint ratchet (lint:css:update rewrites the baseline)
npm run lint:contrast        # WCAG contrast of token pairs (scripts/contrast-pairs.json)
npm run lint:html            # Build unminified site + html-validate ratchet (lint:html:update)
npm run format               # Auto-format all files with Prettier
npm run e2e                  # Playwright E2E tests (auto-starts Hugo server)
npm run vrt                  # Visual regression tests in Docker (see below)
npm run vrt:update           # Re-generate changed VRT baselines in Docker
npm run a11y                 # axe + landmark/heading outline in Docker (see below)
npm run a11y:update          # Rewrite the axe baseline and changed outline snapshots
npm run lighthouse           # Lighthouse on the static build (report only, see below)
npm run style:diff           # Computed-style diff of the CSS against origin/main (see below)
npm run build:snapshot       # Deterministic static build used by VRT (.snapshot/site)
npm run vendor:verify        # Verify vendored files match node_modules
npm run vendor:update        # Bump patch versions & re-vendor
```

### Running a single E2E test

```bash
npx playwright test tests/e2e/f-03-theme-toggle.spec.js
```

### Playwright setup (first time)

```bash
npx playwright install --with-deps chromium
```

### CI pipeline

CI runs three independent jobs: `lint` (Prettier, stylelint and contrast ratchets), `build` (Hugo build + html-validate ratchet), `vendor` (integrity check). E2E runs in a separate workflow, VRT and a11y run in `snapshot.yml` (jobs `vrt` and `a11y`), and Lighthouse runs in `lighthouse.yml` (report only, not required). All workflows install Hugo and Node from `mise.toml` via `jdx/mise-action`. `main` is protected: `lint`, `build`, `vendor`, `e2e`, `vrt` and `a11y` are required status checks.

### Visual regression tests (VRT)

- Baselines live in `tests/vrt/__snapshots__/` and are committed to git. They are only ever produced inside the official Playwright Docker image (`linux/amd64`), so `npm run vrt` / `vrt:update` need Docker. On Apple silicon, enable "Use Rosetta for x86_64/amd64 emulation" in Docker Desktop.
- `scripts/pw-docker.sh` builds `example_site` with `scripts/build-site.sh` (likeApi removed, footer year fixed, `TZ=UTC`) and runs `playwright.snapshot.config.js` against a static server. That config refuses to run outside the container.
- The styleguide page (`example_site/content/page/styleguide/`) is excluded from lists, search, related posts and the sitemap; VRT shoots it section by section.
- Two shots run with forced colors (Windows high contrast), where backgrounds and shadows are replaced by system colors.
- When a UI change is intended, run `npm run vrt:update`, review the PNG diff, and commit the updated baselines with the change. Delete baselines that a renamed test no longer produces.
- Dependabot PRs for `@playwright/test` are excluded from auto-merge (the browser and Docker image change with it). Check out the PR branch, run `npm run vrt:update`, review, and push the baselines before merging.
- Vendor auto-update PRs are created with `GITHUB_TOKEN`, so CI does not run on them and required checks stay pending; merge them manually as an admin after checking the diff.

### Ratchets (stylelint, html-validate, contrast, axe)

Existing findings are recorded as counts, and every check must match its baseline exactly (`scripts/lib/ratchet.cjs`): a new or increased finding fails, and so does a decrease, which is fixed by re-running the matching `*:update` script and committing the tighter baseline. Fix new findings instead of updating the baseline to hide them.

- stylelint (`.stylelintrc.json`): rules at `error` severity are not ratcheted and must have no violations. They allow no raw colors outside `tokens.css` (hex, named colors, color functions, `light-dark()`), only `var(--pochi-z-*)` in `z-index` and `var(--pochi-radius-*)` in `border-*radius` (or `0`), and no `!important` (the two that stay carry a `stylelint-disable-next-line` comment with the reason). The warnings are counted per `rule[property]` in `tests/baselines/stylelint.json`; custom properties share the key `--*`. They ask for a token in `font-size` and a unitless `line-height`.
- html-validate (`.htmlvalidate.json`): counts per rule in `tests/baselines/html-validate.json`, over an unminified build in `.snapshot/html`. Hugo's alias redirect pages are skipped.
- Contrast (`scripts/check-contrast.mjs`): resolves the tokens in `tokens.css` for light and dark (`var()`, `light-dark()`, `color-mix()`, alpha compositing) and checks each pair in `scripts/contrast-pairs.json` with WCAG 2.1 contrast, and with APCA where the pair sets `apcaMin` (body text: Lc 75; elsewhere APCA is printed for reference). A failing pair must carry the roadmap audit ID in `known`, and a known failure that starts passing fails until the ID is removed. It also checks the theme wiring: `color-scheme` on `:root` / `:root.light` / `:root.dark` (which set nothing else), the `@supports not (color: light-dark(...))` fallback redeclaring every `light-dark()` token with its light value, and the `theme-color` meta tags in `head/meta.html` matching `--pochi-card`. When adding a color token, add the pairs it is used in.
- a11y (`tests/a11y/`, Docker like VRT, pages in `pages.js` at 1280px, a few also at 375px): axe (WCAG 2.0–2.2 A/AA + best-practice, including the 24px `target-size`) per page and theme, counted per rule in `tests/a11y/known-violations.json`; the landmark/heading outline from the accessibility tree is a text snapshot per page in `tests/a11y/__snapshots__/`. `npm run a11y:update` (`A11Y_UPDATE=1`) rewrites both. `target-size.spec.js` (not a ratchet) checks that the main controls are at least 44px.

### Lighthouse

`npm run lighthouse` builds `.snapshot/site`, serves it with gzip and runs Lighthouse 3 times per page (mobile defaults) through its Node API (`scripts/lighthouse.mjs`), keeping the median run. Pages and assertions live in `scripts/lighthouse-targets.json` (Lighthouse CI's assertion shape): `warn` is only reported, `error` exits 1. Reports and `summary.md` go to `.lighthouse/`; on CI the table is written to the job summary and the reports are uploaded as the `lighthouse-reports` artifact. Chrome is Playwright's Chromium unless `CHROME_PATH` is set. Lighthouse CI itself is not used because its pinned dependencies carry known vulnerabilities.

### Computed-style diff

`npm run style:diff` (`scripts/style-diff.mjs`, host Chromium) is for CSS refactors that must not change the look. It builds example_site from the working tree and from a base ref (`--base`, default `origin/main`, via `git archive`), then renders the working-tree HTML twice per page, once with each CSS bundle, and compares every computed property of every element and its `::before` / `::after` (colors normalized to 8-bit sRGB). It covers the a11y pages × light / dark × 375 / 768 / 1280px × four states: `default`, `hover` and `focus` (the CSS's `:hover` / `:focus*` are rewritten to always match, with the same specificity) and `active` (every `aria-pressed` / `aria-expanded` set to `true`, side nav open, scroll-to-top shown). Changes inherited from the parent are folded into the parent, and a difference must show up on a second read to count. The report goes to `.snapshot/style-diff/report.md`; exit 1 means something differs. Narrow a run with `--pages`, `--themes`, `--widths`, `--states`. It is not in CI: put the expected differences in the PR instead.

## Architecture

### Template layer (`layouts/`)

- `_default/baseof.html` — base skeleton; blocks: `header`, `main`, `footer`
- Page types: `_default/single.html`, `_default/list.html`, `_default/terms.html`, `_default/search.html`, `posts/single.html`, `archives/list.html`, `404.html`
- Partials follow atomic design: `atoms/`, `molecules/`, `organisms/`, `core/`, `head/`
- **PJAX contract**: every page must render exactly one `.main-content` wrapper. PJAX swaps this node during navigation.

### Asset pipeline (`assets/`)

- **CSS**: Hugo Pipes bundles all CSS in `core/resources_css.html` into cascade layers `reset, tokens, base, layout, components, utilities`: a later layer beats an earlier one whatever the specificity, so specificity and file order only matter inside a layer. A new CSS file must be added to its layer's list there; a listed file that does not exist fails the build. Design tokens live in `css/tokens.css` in two tiers: primitive colors (OKLCH, named by lightness, e.g. `--pochi-gray-97`) and semantic tokens (`--pochi-text`, `--pochi-z-*`, `--pochi-radius-*`, `--pochi-duration-*`, `--pochi-focus-ring` …); components use the semantic ones. Element defaults in `css/base.css` and `css/typography.css` (base layer); one file per component in `css/components/` (components layer); `css/utilities.css` is the last layer, so utilities need no `!important`. Shared looks used by several components sit before them in the components layer (`chip.css`, `section-heading.css`) so a component can override them at the same specificity. Breakpoints are 768px and 1200px in range syntax (`width < 768px`, `width >= 768px`); the two exceptions are commented in `hero.css` and `layout/grid.css`.
- **CSS accessibility conventions**: the focus ring is defined once (`:focus-visible` in `base.css`); a component only moves it inward where it would be clipped. Hover-only effects go inside `@media (hover: hover)`. Transitions use the `--pochi-duration-*` tokens, which reduced motion sets to `0s`. The main controls use `--pochi-target-min` (44px). Anything drawn only with a background or a shadow needs a `@media (forced-colors: active)` fallback. Links in article text are underlined; a component link inside an article removes it in its own file.
- **JS**: Hugo Pipes bundles all JS in `core/resources_js.html`. Entry point is `js/main.js` (initializes all modules on DOMContentLoaded). Other modules: `navigation.js` (PJAX), `scrollspy.js`, `archives-toggle.js`, `like-button.js`, `share-button.js`, `lang-switcher.js`, `lightbox.js`.
- **Vendor**: Fuse.js, Mark.js, modern-normalize are vendored under `assets/{js,css}/vendor/`. Managed via `scripts/vendor-sync.js` with integrity hashes in `VENDOR.lock.json`. Never edit vendored files directly.

### Dark mode

Semantic color tokens pick their light and dark values with `light-dark()`, which follows `color-scheme`: `light dark` on `:root` (the OS decides, also without JS), `light` / `dark` once the head script or the toggle puts the `light` / `dark` class on `<html>` (not `<body>`). Write per-theme colors as `light-dark()` tokens in `tokens.css`, not as `.dark` rules. Browsers without `light-dark()` get the light theme from an `@supports not` fallback and no toggle. JS persists preference to `localStorage` key `pref-theme`.

### Search

Client-side via Fuse.js. Index served as `index.json` from Hugo's output. Search form reads `data-index-url` attribute for the index URL.

### Markdown image size hints

Markdown images resolve through `layouts/_default/_markup/render-image.html` and
the `atoms/picture.html` partial. Authors can request a display size via the
Markdown title attribute using an `=` prefix:

- `![alt](image.jpg "=300x")` — width only (aspect ratio preserved via CSS `height: auto`)
- `![alt](image.jpg "=300x200")` — width and height
- `![alt](image.jpg "=x200")` — height only

When a size hint is present, the `<img>` `width` / `height` attributes and the
`<picture>` `sizes` attribute are set accordingly; otherwise the existing
responsive pipeline is untouched. Raw `<img width="...">` tags also work (via
`markup.goldmark.renderer.unsafe = true`), but they bypass the `<picture>`
AVIF/WebP generation.

### i18n

Translation strings in `i18n/ja.toml` and `i18n/en.toml`. Templates use `{{ T "key" }}`.

### E2E tests (`tests/e2e/`)

Playwright tests using a custom fixture (`fixtures.js`) that auto-fails on uncaught `pageerror` and `console.error`. The fixture also mocks the like-counter API. Tests are prefixed: `p-*` for page-level, `f-*` for feature-level.

## Coding Conventions

- **Indentation**: 2 spaces
- **Template files**: kebab-case (e.g., `post-card.html`)
- **JS hooks**: use `data-pochi-*` attributes for JS selectors to avoid coupling with styling classes
- **Formatting**: Prettier with `prettier-plugin-go-template` for `.html`, plus SCSS/JS/YAML. A PostToolUse hook auto-runs `npm run format` after edits.
- **Commits**: imperative mood with scope (e.g., `fix(list): correct ellipsis wrap`)
- **PRs**: include before/after screenshots for UI changes
