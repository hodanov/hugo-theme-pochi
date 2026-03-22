# Pochi — Hugo Theme

## Local Development

- Install deps and sync vendor libraries:
  - `npm ci`
  - `npm run vendor:sync` (copies Fuse/Mark into `assets/js/vendor/`)
- Start preview: `npm run serve`

## Search Vendors (CSP/Offline)

- Fuse.js and Mark.js are vendored via Hugo Pipes.
- Files live under `assets/js/vendor/` with stable names: `fuse.js`, `mark.js`.
- To update:
  - Bump versions in `package.json` devDependencies.
  - Run `npm i` then `npm run vendor:sync`.
  - Verify with `npm run vendor:verify`.

## Like Button

The left sidebar on single post pages includes a like button (`#icon-heart`). It works with an external counter API, independent of giscus comments.

### How it works

- On page load, the button fetches the current count via `GET <apiBase>/like?slug=<slug>`.
- On click, it sends `POST <apiBase>/like?slug=<slug>` and increments the count.
- Duplicate likes are prevented client-side with `localStorage` (`liked:<slug>`).
- The button reads `data-like-api` and `data-like-slug` attributes from the template.

### Site configuration

Add the API base URL to your Hugo `params`:

```yaml
# params.yaml
likeApi:
  baseUrl: "https://like.example.com"
```

### Counter API (Cloudflare Worker)

A reference implementation lives in `workers/like-counter/` at the site repository level (not inside the theme).

Setup:

```bash
cd workers/like-counter
npm install
npx wrangler login
npx wrangler kv namespace create LIKES            # production
npx wrangler kv namespace create LIKES --preview   # local dev
```

Paste the returned IDs into `wrangler.toml`, then:

```bash
npx wrangler dev --env preview   # local dev at localhost:8787
npx wrangler deploy              # deploy to Cloudflare
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to match your blog domain for CORS protection.

## Template Contract

- Each page template must render exactly one `.main-content` wrapper. PJAX navigation relies on swapping this node.
- Place page-specific hero and external breadcrumbs outside `.main-content` to keep ordering stable during swaps.
