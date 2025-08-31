# Pochi — Hugo Theme

## Local Development
- Install deps and sync vendor libraries:
  - `npm ci`
  - `npm run vendor:sync` (copies Fuse/Mark into `assets/js/vendor/`)
- Start preview: `npm run serve`

## Search Vendors (CSP/Offline)
- Fuse.js 6.6.2 and Mark.js 8.11.1 are vendored via Hugo Pipes.
- Files live under `assets/js/vendor/` with stable names: `fuse.js`, `mark.js`.
- To update:
  - Bump versions in `package.json` devDependencies.
  - Run `npm i` then `npm run vendor:sync`.
  - Verify with `npm run vendor:verify`.
