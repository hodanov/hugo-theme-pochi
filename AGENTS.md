# Repository Guidelines

This theme is a Hugo project focused on layouts and assets. Keep changes small, reversible, and consistent with existing patterns.

## Project Structure & Module Organization

- `layouts/`: Hugo templates (Go templates). Includes `_default/`, `partials/`, and page-type layouts.
- `assets/`: Source assets compiled by Hugo Pipes (CSS/SCSS, JS, images, icons).
- `example_site/`: Local preview content. Use it to test changes interactively.
- `.github/`: CI and dependency tooling; update when workflows change.
- `theme.toml`: Theme metadata; bump min Hugo version or tags when required.

## Build, Test, and Development Commands

- Preview locally: `hugo serve -s example_site --themesDir .. -t pochi`
  - Serves the example site with live reload.
- Format check: `npx prettier . --check`
- Auto-format: `npx prettier . --write`
  - Uses `prettier-plugin-go-template` to format Go template HTML.

## Coding Style & Naming Conventions

- Indentation: 2 spaces; avoid tabs.
- Templates: Prefer small, composable partials under `layouts/partials/`.
- Naming: kebab-case for files (`post-card.html`), lowercase for asset files.
- CSS/SCSS: Keep variables and mixins scoped; avoid global leaks.
- JS: Keep DOM hooks prefixed (`data-pochi-*`) to prevent conflicts.

## Testing Guidelines

- Manual testing via `hugo serve` on `example_site/` pages: home, posts, pagination, 404, robots.
- Cross-browser smoke check for critical pages; verify no console errors.
- No unit test suite at present; add reproducible steps in PRs for bug fixes.

## Commit & Pull Request Guidelines

- Commits: Imperative mood, concise scope (e.g., `fix(list): correct ellipsis wrap`).
- PRs: Clear description, before/after screenshots for UI, link issues (`#123`), and steps to verify.
- Keep diffs focused; include migration notes if breaking template variables or CSS classes.

## Security & Configuration Tips

- Do not commit secrets; `.env` files are out of scope for a theme.
- Validate third-party assets’ licenses; prefer local, optimized assets in `assets/`.
- Maintain compatibility with the `theme.toml` declared Hugo version.
