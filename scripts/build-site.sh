#!/usr/bin/env bash
# Build example_site deterministically for VRT, a11y, html-validate and LHCI.
#
# Usage: scripts/build-site.sh <outDir> [extra hugo flags...]
#   outDir is relative to the theme root unless absolute.
#
# Overrides that only apply to these builds (E2E via `hugo serve` is untouched):
#   - TZ=UTC so `.Local` dates do not depend on the host time zone
#   - params.likeApi.baseUrl is removed so like-button.js never fetches
#   - params.copyright replaces the footer's `now.Year`
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
dest=${1:?usage: build-site.sh <outDir> [hugo flags...]}
shift
case "$dest" in
/*) out="$dest" ;;
*) out="$root/$dest" ;;
esac

export TZ=UTC
# An empty value removes the key in Hugo >= 0.164, so the template's
# `| default ""` yields data-like-api="" (verified by the guard below).
export HUGO_PARAMS_LIKEAPI_BASEURL=
export HUGO_PARAMS_COPYRIGHT="© 2026 Pochi Example."

# --themesDir is resolved relative to -s, so always pass absolute paths.
hugo --gc --cleanDestinationDir \
	-s "$root/example_site" \
	--themesDir "$(dirname "$root")" -t "$(basename "$root")" \
	-d "$out" "$@"

if grep -rEq "data-like-api=[\"']?https?:" "$out"; then
	echo "build-site: likeApi override was not applied" >&2
	exit 1
fi
if ! grep -q "2026 Pochi Example" "$out/index.html"; then
	echo "build-site: copyright override was not applied" >&2
	exit 1
fi
