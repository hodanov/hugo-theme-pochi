(() => {
  // Detect mobile (iOS/iPadOS/Android) to prefer Web Share; others copy
  function isMobileDevice() {
    try {
      const uaData = navigator.userAgentData;
      if (uaData && typeof uaData.mobile === "boolean") {
        return uaData.mobile;
      }
    } catch (_) {}
    const ua = String(navigator.userAgent || "");
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isIPadMacUA =
      /Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1;
    const isAndroid = /Android/.test(ua);
    const isMobileHint = /Mobile/.test(ua);
    // Treat iPadOS masquerading as Mac as mobile
    if (isIOS || isIPadMacUA) return true;
    if (isAndroid) return true;
    // Some Android tablets don't include "Mobile"; keep a conservative OR
    if (isMobileHint) return true;
    // Fallback: non-mobile platforms
    return false;
  }

  // Use event delegation so it works across PJAX swaps
  function onClick(e) {
    const btn =
      e.target && e.target.closest
        ? e.target.closest("[data-share-button]")
        : null;
    if (!btn) return;
    e.preventDefault();
    const url = btn.getAttribute("data-share-url") || location.href;
    const title = btn.getAttribute("data-share-title") || document.title;
    const live = btn.querySelector("[data-share-feedback]");
    (async () => {
      try {
        if (isMobileDevice() && navigator.share) {
          await navigator.share({ title, url });
        } else {
          await window.__pochiClipboard.copy(url);
          if (live)
            live.textContent = btn.dataset.feedbackCopied || "URL copied";
          btn.setAttribute("aria-pressed", "true");
          setTimeout(() => {
            btn.setAttribute("aria-pressed", "false");
            if (live) live.textContent = "";
          }, 2000);
        }
      } catch (_) {
        if (live) {
          live.textContent = btn.dataset.feedbackFailed || "Copy failed";
          setTimeout(() => (live.textContent = ""), 2000);
        }
      }
    })();
  }

  // Register once per page lifetime
  if (!window.__pochiShareDelegated) {
    document.addEventListener("click", onClick);
    window.__pochiShareDelegated = true;
  }
})();
