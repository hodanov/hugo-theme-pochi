#!/usr/bin/env bash
# Run the snapshot suites (VRT / a11y) inside the official Playwright Docker
# image so baselines never depend on the host OS, fonts or GPU.
#
# Usage: scripts/pw-docker.sh [playwright test args...]
#   e.g. scripts/pw-docker.sh --project=vrt --update-snapshots=changed
#
# - The image tag follows the @playwright/test version in package-lock.json,
#   so a Dependabot bump moves the browser and the image together.
# - linux/amd64 is forced everywhere (Docker Desktop on Apple silicon runs it
#   via Rosetta) so local baselines match the CI runner pixel for pixel.
# - Container node_modules live in a named volume; the host's (macOS) copy is
#   never used. Tests run with --network none.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

pw_version=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")
image="mcr.microsoft.com/playwright:v${pw_version}-noble"

bash scripts/build-site.sh .snapshot/site --minify --baseURL http://127.0.0.1:4173/

common=(
	--rm --init --ipc=host --platform linux/amd64
	-v "$root":/work -w /work
	-v pochi-pw-node-modules:/work/node_modules
)

# Install (or refresh) container dependencies only when the lockfile changes.
docker run "${common[@]}" -v pochi-pw-npm-cache:/root/.npm "$image" bash -c '
	set -eu
	sha=$(sha256sum package-lock.json | cut -d" " -f1)
	if [ "$(cat node_modules/.lock-sha 2>/dev/null || true)" != "$sha" ]; then
		npm ci --ignore-scripts --no-audit --no-fund
		echo "$sha" > node_modules/.lock-sha
	fi
'

docker run "${common[@]}" --network none \
	-e CI -e A11Y_UPDATE -e POCHI_PW_DOCKER=1 \
	"$image" npx playwright test -c playwright.snapshot.config.js "$@"
