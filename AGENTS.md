# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pochi is a Hugo theme for the hodalog.com blog. It supports light/dark mode, client-side search (Fuse.js + Mark.js), PJAX navigation, i18n (ja/en), like button (external API), and Giscus comments. Hugo minimum version: 0.101.1.

## Build & Development Commands

```bash
npm ci                      # Install dependencies
npm run vendor:sync          # Copy Fuse/Mark/normalize into assets/js/vendor/ (required after npm ci)
npm run serve                # Dev server with live reload via example_site
npm run build                # Production-like build of example_site
npm run lint                 # Prettier check (alias: format:check)
npm run format               # Auto-format all files with Prettier
npm run e2e                  # Playwright E2E tests (auto-starts Hugo server)
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

CI runs three independent jobs: `lint` (Prettier), `build` (Hugo build), `vendor` (integrity check). E2E runs in a separate workflow. Hugo version pinned to 0.154.1 in CI.

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
