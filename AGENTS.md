# Repository Guidelines

## Project Structure & Module Organization
- `layouts/`: Hugo templates (Go templates). Prefer small, composable partials in `layouts/partials/`.
- `assets/`: Hugo Pipes sources. SCSS in `assets/scss/` with `_variables.scss`, `_mixins.scss`, `layout/`, `components/`, `utilities/`, and entry `main.scss`.
- `example_site/`: Local preview content; use for manual testing.
- `.github/`: CI and dependency tooling.
- `theme.toml`: Theme metadata; keep Hugo version compatibility.

## Build, Test, and Development Commands
- `npm run serve`: Run `hugo serve -s example_site --themesDir .. -t pochi` with live reload.
- `npm run build`: Build the example site for a production-like check.
- `npm run format`: Format HTML (Go templates via plugin), SCSS, JS, YAML.
- `npm run format:check` (alias: `npm run lint`): CI-friendly formatting check.

## Coding Style & Naming Conventions
- **Indentation:** 2 spaces.
- **Templates:** Keep partials small; name files in kebab-case (e.g., `post-card.html`).
- **Assets:** Lowercase file names; centralize tokens in `assets/scss/_variables.scss`.
- **Dark mode:** Use CSS variables; toggle adds/removes `dark` on `html` (not `body`).
- **JS hooks:** Prefix with `data-pochi-*` to avoid collisions.

## Testing Guidelines
- No unit tests currently. Perform manual checks via `npm run serve` on: home, posts, pagination, 404, robots.
- Verify theme toggle `#theme-toggle-switch` works without FOUC; check console for errors; do a quick cross-browser smoke test.

## Commit & Pull Request Guidelines
- **Commits:** Imperative, concise scope (e.g., `fix(list): correct ellipsis wrap`). Keep diffs focused and reversible.
- **PRs:** Clear description, linked issues (e.g., `#123`), before/after screenshots for UI, and verification steps (include `npm run serve`). Note any breaking changes to template variables or CSS classes and provide migration notes.

## Security & Configuration Tips
- Do not commit secrets; `.env` is out of scope.
- Prefer local, licensed assets in `assets/`; validate third‑party licenses.
- Maintain compatibility with the Hugo version declared in `theme.toml`.

