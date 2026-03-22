(function () {
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function getElementGroups() {
    const btns = $$("[data-like-button]");
    if (btns.length === 0) return null;
    const slug = btns[0].getAttribute("data-like-slug");
    const apiBase = btns[0].getAttribute("data-like-api");
    if (!slug || !apiBase) return null;
    const groups = btns.map(function (btn) {
      const root = btn.closest("[data-like-root]") || btn.parentElement;
      const countEl = root ? root.querySelector("[data-like-count]") : null;
      return { btn, countEl };
    });
    return { groups, slug, apiBase };
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

  function updateAllUI(groups, count, liked) {
    groups.forEach(function (g) {
      if (g.countEl && typeof count === "number") {
        g.countEl.textContent = String(count);
      }
      if (g.btn) {
        g.btn.setAttribute("aria-pressed", String(liked));
      }
    });
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
    const result = getElementGroups();
    if (!result) return;
    const { groups, slug, apiBase } = result;

    // Restore liked state from localStorage
    const liked = isLiked(slug);
    if (liked) {
      groups.forEach(function (g) {
        g.btn.setAttribute("aria-pressed", "true");
      });
    }

    // Fetch current count
    fetchCount(apiBase, slug).then(function (count) {
      if (count !== null) {
        updateAllUI(groups, count, isLiked(slug));
      }
    });

    // Click handler on each button
    groups.forEach(function (g) {
      g.btn.addEventListener("click", async function () {
        if (isLiked(slug)) return;

        // Optimistic update
        const currentText = g.countEl ? g.countEl.textContent : "0";
        const currentCount = parseInt(currentText, 10) || 0;
        const optimisticCount = currentCount + 1;
        updateAllUI(groups, optimisticCount, true);
        markLiked(slug);

        try {
          const serverCount = await postLike(apiBase, slug);
          if (serverCount !== null) {
            updateAllUI(groups, serverCount, true);
          }
        } catch (_) {
          // Rollback on error
          updateAllUI(groups, currentCount, false);
          try {
            localStorage.removeItem("liked:" + slug);
          } catch (_e) {}
        }
      });
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
