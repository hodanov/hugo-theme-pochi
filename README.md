# Pochi — Hugo Theme

## Local Development

- Install pinned Hugo/Node (see `mise.toml`): `mise install`
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
- Put everything that changes per page inside `.main-content`, including the hero of a fixed page (`molecules/hero.html`, rendered as the first child of `<main>`), so one swap replaces it.

## Site Configuration

### Related posts

The related posts under each post come from Hugo's `.Related`, ranked by the site's `related` config. Hugo's default leaves out posts newer than the one being read, so the newest posts never appear. Recommended:

```yaml
related:
  includeNewer: true # newer posts count too
  threshold: 80 # a shared tag is needed; the category and the date only order them
  toLower: true
  indices:
    - name: tags
      weight: 100
    - name: categories
      weight: 50
    - name: date
      weight: 10
```

Lower `threshold` (for example to 40) to fill in posts that share only a category.
