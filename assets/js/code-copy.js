(() => {
  const ICON_COPY =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_CHECK =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const FEEDBACK_DURATION = 2000;

  function getLabel(key) {
    return document.body.dataset[key] || "";
  }

  function injectButtons(root) {
    const blocks = (root || document).querySelectorAll("pre");
    blocks.forEach((pre) => {
      if (pre.dataset.codeCopyInjected) return;
      pre.dataset.codeCopyInjected = "true";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-button";
      btn.dataset.codeCopyButton = "";
      btn.setAttribute("aria-label", getLabel("codeCopyLabel"));
      btn.innerHTML = ICON_COPY;
      pre.appendChild(btn);
    });
  }

  function onClick(e) {
    const btn =
      e.target && e.target.closest
        ? e.target.closest("[data-code-copy-button]")
        : null;
    if (!btn) return;
    e.preventDefault();

    const pre = btn.closest("pre");
    if (!pre) return;

    const code = pre.querySelector("code");
    const source = code || pre;

    // Hugo Chroma with lineNos + lineNumbersInTable=false renders each line
    // as <span style="display:flex;"><span (line-number)>…</span><span (code)>…</span></span>.
    // The line-number span has user-select:none. Extract only the code spans.
    const lineSpans = source.querySelectorAll(
      "span[style*='display:flex'], span[style*='display: flex']",
    );
    let text;
    if (lineSpans.length > 0) {
      const lines = [];
      lineSpans.forEach((line) => {
        const children = line.children;
        // Last child span contains the actual code; earlier spans are line numbers
        if (children.length > 0) {
          lines.push(children[children.length - 1].textContent);
        } else {
          lines.push(line.textContent);
        }
      });
      text = lines.join("").trim();
    } else {
      text = source.textContent.trim();
    }

    (async () => {
      try {
        await window.__pochiClipboard.copy(text);
        btn.innerHTML = ICON_CHECK;
        btn.setAttribute("aria-label", getLabel("codeCopiedLabel"));
        btn.classList.add("code-copy-button--copied");

        if (!pre.querySelector(".code-copy-chip")) {
          const chip = document.createElement("span");
          chip.className = "code-copy-chip";
          chip.textContent = getLabel("codeCopiedLabel");
          chip.setAttribute("aria-hidden", "true");
          pre.appendChild(chip);
          setTimeout(() => chip.remove(), FEEDBACK_DURATION);
        }

        setTimeout(() => {
          btn.innerHTML = ICON_COPY;
          btn.setAttribute("aria-label", getLabel("codeCopyLabel"));
          btn.classList.remove("code-copy-button--copied");
        }, FEEDBACK_DURATION);
      } catch (_) {
        btn.setAttribute("aria-label", getLabel("codeCopyFailedLabel"));
        setTimeout(() => {
          btn.setAttribute("aria-label", getLabel("codeCopyLabel"));
        }, FEEDBACK_DURATION);
      }
    })();
  }

  // Initial injection
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => injectButtons());
  } else {
    injectButtons();
  }

  // Re-inject after PJAX swap
  document.addEventListener("pochi:afterSwap", () => injectButtons());

  // Register click handler once
  if (!window.__pochiCodeCopyDelegated) {
    document.addEventListener("click", onClick);
    window.__pochiCodeCopyDelegated = true;
  }
})();
