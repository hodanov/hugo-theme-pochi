(() => {
  function fallbackCopyTextToClipboard(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      const selection = document.getSelection();
      const selected =
        selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      if (selected) {
        selection.removeAllRanges();
        selection.addRange(selected);
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return fallbackCopyTextToClipboard(text);
  }

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
          await copyToClipboard(url);
          if (live) live.textContent = "URLをコピーしました";
          btn.setAttribute("aria-pressed", "true");
          setTimeout(() => {
            btn.setAttribute("aria-pressed", "false");
            if (live) live.textContent = "";
          }, 2000);
        }
      } catch (_) {
        if (live) {
          live.textContent = "コピーに失敗しました";
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
