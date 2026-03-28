---
name: F-14 lightbox press vs keyboard pattern
description: Review finding — overlay.press("Escape") works by accident since CDP dispatches page-level key events even when focus fails on tabindex-less div; prefer page.keyboard.press for document-level keydown listeners
type: project
---

In F-14 lightbox tests, `overlay.press("Escape")` at line 120 of `f-14-lightbox.spec.js` is semantically incorrect because the `.lightbox-overlay` div has no `tabindex` and the keydown listener is on `document`, not the overlay element. The test passes because Playwright's CDP-level key dispatch reaches `document` regardless of focus state, but it should use `page.keyboard.press("Escape")` for consistency with line 57.

**Why:** The lightbox's `keydown` handler is registered on `document` (lightbox.js:46), not on the overlay div. `locator.press()` attempts to focus the target element first, but a div without `tabindex` silently fails to receive focus. The CDP key event still propagates to document, making the test pass for the wrong reason.

**How to apply:** When reviewing lightbox or modal tests, verify that keyboard shortcuts targeting `document`-level listeners use `page.keyboard.press()`, not `locator.press()`. The `role="dialog"` overlay also lacks `tabindex="-1"` and `focus()` call, which is an accessibility gap worth tracking separately.
