---
name: F-15 code-copy Chroma HTML structure analysis
description: Hugo Chroma lineNos+lineNumbersInTable=false always produces 2-child span structure (line-number + code) even for empty lines; display:flex has no space in current output
type: project
---

Hugo Chroma with `lineNos = true` and `lineNumbersInTable = false` produces each line as:
`<span style="display:flex;"><span (line-number)>N</span><span (code)>...</span></span>`

Key findings from 2026-03-29 review of `code-copy.js`:

1. **children.length is always 2**: Even for empty source lines, Chroma generates both the line-number span and the code span. The `children.length === 1` path in code-copy.js is unreachable with current Chroma output.

2. **`display:flex` has no space**: Chroma outputs `display:flex;` (no space after colon). The `span[style*='display:flex']` selector works, but `display: flex` (with space) would not match.

3. **Plain code blocks** (no language specified) render as bare `<pre><code>` without `display:flex` spans -- the `lineSpans.length > 0` guard correctly falls through to `textContent`.

4. **E2E test gap**: No test content includes empty lines in code blocks. Added as improvement recommendation.

**Why:** Defensive coding against Hugo/Chroma version changes is low-cost and protects against subtle regressions in copy behavior.

**How to apply:** When reviewing code that parses Chroma HTML output, always verify against actual build output in `example_site/public/`. Chroma's inline style format is not contractual and could change between Hugo versions.
