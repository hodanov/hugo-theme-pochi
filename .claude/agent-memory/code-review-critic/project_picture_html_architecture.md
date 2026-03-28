---
name: picture.html rendering paths and width resolution
description: picture.html has 3 rendering paths with different quality params; widths are resolved with caller override > site param > default; preload must match each path exactly
type: project
---

`layouts/partials/atoms/picture.html` has 3 rendering paths:

1. **Path 1 (line 46-108)**: Source is JPG/PNG. Generates AVIF/WEBP via Hugo Image Processing. Quality: webp q75, avif q60.
2. **Path 2 (line 109-153)**: Source is AVIF/WEBP with a sidecar JPG/PNG. Uses sidecar as base for resizing. Quality: **q65** (primary AVIF/WEBP, configurable via `site.Params.images.sidecarQuality`), **q80** (JPG fallback). Different from Path 1.
3. **Path 3 (line 154-169)**: Source is AVIF/WEBP without sidecar. Single source output, no responsive srcset.

**Width resolution order** (picture.html lines 17-24):

1. Default: `(slice 480 800 1200)`
2. Override by `site.Params.images.widths` if set
3. **Final override** by caller's `.widths` if passed -- this always wins

**LCP featured image callers always pass explicit `.widths`:**

- `post_meta_featured_image.html`: `(slice 480 800 1200 1600)` for posts
- `hero.html`: `(slice 480 800 1200 1600 2000 2400)` for non-posts
- Therefore `site.Params.images.widths` is effectively dead code for LCP paths

**Bounding**: `picture.html` uses `bounded_widths.html` partial (with origW fallback for empty results); `preload_lcp_image.html` uses inline `if le $w $origW` at lines 28-33 and 51-60 without the empty-result fallback. Confirmed as real inconsistency in 2026-03-28 review -- preload silently skips when all widths > origW, while picture.html falls back to origW. Fix: replace both inline loops with `partial "atoms/bounded_widths.html"` call.

**Hugo image processing caching (verified 2026-03-28):** Hugo uses in-memory memoization within a single build. Same `$resource.Resize("params")` on the same resource deduplicates via hash key. Disk cache (`resources/_gen/`) persists between builds. `--gc` prunes unused entries AFTER build, does not clear cache before build. Therefore, having both preload_lcp_image.html and picture.html call the same Resize with same params does NOT double the transcode cost.

**Quality parameter duplication:** `q75` (webp), `q60` (avif), `q80` (jpg fallback) are hardcoded magic numbers in both `picture.html` and `preload_lcp_image.html`. `sidecarQuality` (default 65) is properly shared via `site.Params.images.sidecarQuality`. The other three quality values are not yet configurable or extracted into a shared partial. This is a maintainability risk: changing quality in one file but not the other would cause URL mismatch and wasted preload.

**Why:** preload_lcp_image.html must match the exact quality parameters and widths of whatever picture.html produces. Mismatched parameters = different Hugo resize output = different URLs = wasted preload + browser console warnings.

**How to apply:** When modifying preload logic, always verify quality parameters match the corresponding picture.html path. Path 2 uses q65/q80, not q75/q60. When checking widths alignment, trace from the actual caller (hero.html / post_meta_featured_image.html), not from picture.html defaults.
