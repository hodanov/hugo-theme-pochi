(function () {
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getElements() {
    const btn = $("[data-like-button]");
    if (!btn) return null;
    const countEl = $("[data-like-count]");
    const slug = btn.getAttribute("data-like-slug");
    const apiBase = btn.getAttribute("data-like-api");
    if (!slug || !apiBase) return null;
    return { btn, countEl, slug, apiBase };
  }

  function isLiked(slug) {
    try {
      return localStorage.getItem("liked:" + slug) === "1";
    } catch (_) {
      return false;
    }
  }

  function markLiked(slug) {
    try {
      localStorage.setItem("liked:" + slug, "1");
    } catch (_) {}
  }

  function updateUI(btn, countEl, count, liked) {
    if (countEl && typeof count === "number") {
      countEl.textContent = String(count);
    }
    if (btn) {
      btn.setAttribute("aria-pressed", String(liked));
    }
  }

  async function fetchCount(apiBase, slug) {
    try {
      const res = await fetch(
        apiBase + "/like?slug=" + encodeURIComponent(slug),
      );
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.count === "number" ? data.count : null;
    } catch (_) {
      return null;
    }
  }

  async function postLike(apiBase, slug) {
    const res = await fetch(
      apiBase + "/like?slug=" + encodeURIComponent(slug),
      {
        method: "POST",
      },
    );
    if (!res.ok) throw new Error("POST failed: " + res.status);
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  }

  function init() {
    const els = getElements();
    if (!els) return;
    const { btn, countEl, slug, apiBase } = els;

    // Restore liked state from localStorage
    const liked = isLiked(slug);
    if (liked) {
      btn.setAttribute("aria-pressed", "true");
    }

    // Fetch current count
    fetchCount(apiBase, slug).then(function (count) {
      if (count !== null) {
        updateUI(btn, countEl, count, isLiked(slug));
      }
    });

    // Click handler
    btn.addEventListener("click", async function () {
      if (isLiked(slug)) return;

      // Optimistic update
      const currentText = countEl ? countEl.textContent : "0";
      const currentCount = parseInt(currentText, 10) || 0;
      const optimisticCount = currentCount + 1;
      updateUI(btn, countEl, optimisticCount, true);
      markLiked(slug);

      try {
        const serverCount = await postLike(apiBase, slug);
        if (serverCount !== null) {
          updateUI(btn, countEl, serverCount, true);
        }
      } catch (_) {
        // Rollback on error
        updateUI(btn, countEl, currentCount, false);
        try {
          localStorage.removeItem("liked:" + slug);
        } catch (_e) {}
      }
    });
  }

  function boot() {
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Re-init after PJAX swap
  document.addEventListener("pochi:afterSwap", boot);
})();
