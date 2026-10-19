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

CI runs three independent jobs: `lint` (Prettier, stylelint and contrast ratchets), `build` (Hugo build + html-validate ratchet), `vendor` (integrity check). E2E runs in a separate workflow, and VRT and a11y run in `snapshot.yml` (jobs `vrt` and `a11y`). All workflows install Hugo and Node from `mise.toml` via `jdx/mise-action`. `main` is protected: `lint`, `build`, `vendor`, `e2e`, `vrt` and `a11y` are required status checks.

### Visual regression tests (VRT)

- Baselines live in `tests/vrt/__snapshots__/` and are committed to git. They are only ever produced inside the official Playwright Docker image (`linux/amd64`), so `npm run vrt` / `vrt:update` need Docker. On Apple silicon, enable "Use Rosetta for x86_64/amd64 emulation" in Docker Desktop.
- `scripts/pw-docker.sh` builds `example_site` with `scripts/build-site.sh` (likeApi removed, footer year fixed, `TZ=UTC`) and runs `playwright.snapshot.config.js` against a static server. That config refuses to run outside the container.
- The styleguide page (`example_site/content/page/styleguide/`) is excluded from lists, search, related posts and the sitemap; VRT shoots it section by section.
- When a UI change is intended, run `npm run vrt:update`, review the PNG diff, and commit the updated baselines with the change. Delete baselines that a renamed test no longer produces.
- Dependabot PRs for `@playwright/test` are excluded from auto-merge (the browser and Docker image change with it). Check out the PR branch, run `npm run vrt:update`, review, and push the baselines before merging.
- Vendor auto-update PRs are created with `GITHUB_TOKEN`, so CI does not run on them and required checks stay pending; merge them manually as an admin after checking the diff.

### Ratchets (stylelint, html-validate, contrast, axe)

Existing findings are recorded as counts, and every check must match its baseline exactly (`scripts/lib/ratchet.cjs`): a new or increased finding fails, and so does a decrease, which is fixed by re-running the matching `*:update` script and committing the tighter baseline. Fix new findings instead of updating the baseline to hide them.

- stylelint (`.stylelintrc.json`, all rules are warnings): counts per `rule[property]` in `tests/baselines/stylelint.json`. Custom properties share the key `--*`. The extra rules ask for tokens (`var()`) in `z-index` / `border-radius` / `font-size`, unitless `line-height`, no `!important` and no raw colors outside `tokens.css`.
- html-validate (`.htmlvalidate.json`): counts per rule in `tests/baselines/html-validate.json`, over an unminified build in `.snapshot/html`. Hugo's alias redirect pages are skipped.
- Contrast (`scripts/check-contrast.mjs`): resolves the tokens in `tokens.css` for light and dark (`var()`, `light-dark()`, `color-mix()`, alpha compositing) and checks each pair in `scripts/contrast-pairs.json` with WCAG 2.1 contrast (APCA is printed for reference). A failing pair must carry the roadmap audit ID in `known`, and a known failure that starts passing fails until the ID is removed. It also fails when the `prefers-color-scheme: dark` fallback block drifts from `:root.dark`. When adding a color token, add the pairs it is used in.
- a11y (`tests/a11y/`, Docker like VRT, 13 pages in `pages.js`): axe (WCAG 2.0–2.2 A/AA + best-practice) per page and theme, counted per rule in `tests/a11y/known-violations.json`; the landmark/heading outline from the accessibility tree is a text snapshot per page in `tests/a11y/__snapshots__/`. `npm run a11y:update` (`A11Y_UPDATE=1`) rewrites both.

## Architecture

### Template layer (`layouts/`)

- `_default/baseof.html` — base skeleton; blocks: `header`, `main`, `footer`
- Page types: `_default/single.html`, `_default/list.html`, `_default/terms.html`, `_default/search.html`, `posts/single.html`, `archives/list.html`, `404.html`
- Partials follow atomic design: `atoms/`, `molecules/`, `organisms/`, `core/`, `head/`
- **PJAX contract**: every page must render exactly one `.main-content` wrapper. PJAX swaps this node during navigation.

### Asset pipeline (`assets/`)

- **CSS**: Hugo Pipes bundles all CSS in `core/resources_css.html`. Design tokens live in `css/tokens.css`. Files organized as `css/{base,layout/,components/,vendor/,utilities}.css` plus `css/main.css`.
- **JS**: Hugo Pipes bundles all JS in `core/resources_js.html`. Entry point is `js/main.js` (initializes all modules on DOMContentLoaded). Other modules: `navigation.js` (PJAX), `scrollspy.js`, `archives-toggle.js`, `like-button.js`, `share-button.js`, `lang-switcher.js`, `lightbox.js`.
- **Vendor**: Fuse.js, Mark.js, modern-normalize are vendored under `assets/{js,css}/vendor/`. Managed via `scripts/vendor-sync.js` with integrity hashes in `VENDOR.lock.json`. Never edit vendored files directly.

### Dark mode

CSS variables in `tokens.css`; toggled by adding/removing `dark` class on `<html>` (not `<body>`). JS persists preference to `localStorage` key `pref-theme`.

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
