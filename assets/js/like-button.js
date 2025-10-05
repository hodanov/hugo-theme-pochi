(function () {
  const GISCUS_ORIGIN = "https://giscus.app";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function extractHeartCount(meta) {
    try {
      const r =
        meta && (meta.reactions || meta.reactionGroups || meta.reaction);
      if (!r) return null;
      if (typeof r.HEART === "number") return r.HEART;
      if (Array.isArray(r)) {
        const found = r.find(
          (x) => x && (x.content === "HEART" || x.emoji === "HEART"),
        );
        if (found && typeof found.count === "number") return found.count;
      }
      if (r.nodes && Array.isArray(r.nodes)) {
        const n = r.nodes.find((x) => x && x.content === "HEART");
        if (n && typeof n.users?.totalCount === "number")
          return n.users.totalCount;
      }
      if (r.heart || r.hearts) return Number(r.heart || r.hearts) || null;
    } catch (_) {}
    return null;
  }

  function extractViewerHeart(meta) {
    try {
      if (typeof meta.viewerHasReacted === "boolean")
        return meta.viewerHasReacted;
      if (meta.viewer && typeof meta.viewer.hearted === "boolean")
        return meta.viewer.hearted;
      if (Array.isArray(meta.reactionGroups)) {
        const g = meta.reactionGroups.find((g) => g && g.content === "HEART");
        if (g && typeof g.viewerHasReacted === "boolean")
          return g.viewerHasReacted;
      }
    } catch (_) {}
    return null;
  }

  function updateUI(state) {
    try {
      const btn = $("[data-like-button]");
      const countEl = $("[data-like-count]");
      if (!btn || !countEl) return;
      if (typeof state.count === "number")
        countEl.textContent = String(state.count);
      if (typeof state.viewer === "boolean")
        btn.setAttribute("aria-pressed", String(state.viewer));
    } catch (_) {}
  }

  // Flyout-related code removed as we use smooth scroll UX

  function findGiscusFrame(retries = 30) {
    return new Promise((resolve) => {
      function tick(left) {
        const frame = document.querySelector("iframe.giscus-frame");
        if (frame) return resolve(frame);
        if (left <= 0) return resolve(null);
        setTimeout(() => tick(left - 1), 100);
      }
      tick(retries);
    });
  }

  //

  function initListeners() {
    // Metadata from giscus
    window.addEventListener("message", function onMessage(e) {
      try {
        if (e.origin !== GISCUS_ORIGIN) return;
        const payload = e.data && (e.data.giscus || e.data);
        if (!payload) return;
        // Expect payload.discussion for metadata events
        const meta = payload.discussion || payload.meta || null;
        if (!meta) return;
        const count = extractHeartCount(meta);
        const viewer = extractViewerHeart(meta);
        updateUI({ count, viewer });
      } catch (_) {}
    });

    // Button scroll to giscus
    const btn = $("[data-like-button]");
    if (btn) {
      btn.addEventListener("click", async () => {
        // Find giscus container or iframe and scroll into view
        const container = document.querySelector(".comments");
        if (container) {
          try {
            container.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (_) {}
          return;
        }
        const frame =
          document.querySelector("iframe.giscus-frame") ||
          (await findGiscusFrame());
        if (frame) {
          try {
            frame.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (_) {}
        }
      });
    }
  }

  function boot() {
    initListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Re-init after PJAX swap
  document.addEventListener("pochi:afterSwap", boot);
})();
