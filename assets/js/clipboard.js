// Shared clipboard utility used by share-button.js and code-copy.js.
// Exposes window.__pochiClipboard.copy(text) → Promise<void>.
(() => {
  if (window.__pochiClipboard) return;

  function fallback(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      const sel = document.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (range) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  window.__pochiClipboard = {
    copy: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return fallback(text);
    },
  };
})();
