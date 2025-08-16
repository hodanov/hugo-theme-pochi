# Repository Guidelines

This Hugo theme focuses on clean layouts and Hugo Pipes assets. Keep changes small, reversible, and consistent with existing patterns.

## Project Structure & Module Organization

- `layouts/`: Hugo templates (Go templates). Includes `_default/`, `partials/`, and page-type layouts.
- `assets/`: Source assets compiled by Hugo Pipes (SCSS, JS, images, icons).
  - SCSS: `assets/scss/` with `_variables.scss`, `_mixins.scss`, `layout/`, `components/`, `utilities/`, `main.scss`.
- `example_site/`: Local preview content. Use it to test changes interactively.
- `.github/`: CI and dependency tooling; update when workflows change.
- `theme.toml`: Theme metadata; bump min Hugo version or tags when required.

## Build, Test, and Development Commands

- Preview locally: `npm run serve`
  - Runs `hugo serve -s example_site --themesDir .. -t pochi` with live reload.
- Build example site: `npm run build`
- Format all files: `npm run format`
- Format check (CI-friendly): `npm run format:check` (alias: `npm run lint`)
  - Prettier targets HTML (Go template via plugin), SCSS, JS, YAML.
  - After creating or editing code, run: `npm run format`.

## Coding Style & Naming Conventions

- Indentation: 2 spaces; avoid tabs.
- Templates: Prefer small, composable partials under `layouts/partials/`.
- Naming: kebab-case for files (`post-card.html`), lowercase for asset files.
- CSS/SCSS: Prefer tokens in `_variables.scss`; use CSS variables and `:root.dark` for dark mode.
  - Dark mode: toggle adds/removes `dark` class on `html` (not `body`).
- JS: Keep DOM hooks prefixed (`data-pochi-*`) to prevent conflicts.

## Testing Guidelines

- Manual testing via `npm run serve` on `example_site/` pages: home, posts, pagination, 404, robots.
- Verify theme toggle (`#theme-toggle-switch`) works; no FOUC on initial load.
- Cross-browser smoke check for critical pages; verify no console errors.
- No unit test suite at present; add reproducible steps in PRs for bug fixes.

## Commit & Pull Request Guidelines

- Commits: Imperative mood, concise scope (e.g., `fix(list): correct ellipsis wrap`).
- PRs: Clear description, before/after screenshots for UI, link issues (`#123`), and steps to verify (include `npm run serve` steps).
- Keep diffs focused; include migration notes if breaking template variables or CSS classes.

## Security & Configuration Tips

- Do not commit secrets; `.env` files are out of scope for a theme.
- Validate third-party assets’ licenses; prefer local, optimized assets in `assets/`.
- Maintain compatibility with the `theme.toml` declared Hugo version.
