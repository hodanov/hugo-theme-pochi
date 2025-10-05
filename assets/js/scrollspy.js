// Minimal TOC scrollspy for right sidebar
(function () {
  function init() {
    const tocNav = document.querySelector(
      "#sidebar-right .table-of-contents nav, #sidebar .table-of-contents nav",
    );
    if (!tocNav) return;

    const links = Array.from(tocNav.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    const idFromHref = (href) => (href || "").replace(/^#/, "").trim();
    const targets = links
      .map((a) => {
        try {
          const sel = a.getAttribute("href");
          const el = sel ? document.querySelector(sel) : null;
          return el && el.id ? el : null;
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    if (!targets.length) return;

    const linkById = new Map();
    links.forEach((a) => {
      const id = idFromHref(a.getAttribute("href"));
      if (id) linkById.set(id, a);
    });

    function clearActive() {
      links.forEach((a) => {
        a.classList.remove("is-active");
        try {
          a.removeAttribute("aria-current");
        } catch (_) {}
      });
    }
    function setActive(id) {
      const a = linkById.get(id);
      if (!a) return;
      clearActive();
      a.classList.add("is-active");
      try {
        a.setAttribute("aria-current", "location");
      } catch (_) {}
    }

    // Scroll-based highlight with hysteresis to avoid flicker
    let lastActiveId = null;
    let lastScrollY = window.scrollY;
    let ticking = false;
    const headerOffset = 80; // approximate fixed header + spacing
    const hysteresis = 12; // px; resist switching exactly at boundaries

    let positions = [];
    function recomputePositions() {
      positions = targets.map((el) => {
        try {
          const rect = el.getBoundingClientRect();
          return rect.top + window.scrollY;
        } catch (_) {
          return el.offsetTop || 0;
        }
      });
    }

    function computeActiveId() {
      const dir =
        window.scrollY > lastScrollY
          ? 1
          : window.scrollY < lastScrollY
            ? -1
            : 0;
      const probe =
        window.scrollY +
        headerOffset +
        (dir > 0 ? hysteresis : dir < 0 ? -hysteresis : 0);
      let idx = -1;
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] <= probe) idx = i;
        else break;
      }
      if (idx < 0) idx = 0;
      const el = targets[idx];
      return el ? el.id : null;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const id = computeActiveId();
        if (id && id !== lastActiveId) {
          lastActiveId = id;
          setActive(id);
        }
        lastScrollY = window.scrollY;
        ticking = false;
      });
    }

    // Initial run
    recomputePositions();
    setTimeout(() => {
      recomputePositions();
      const firstId = computeActiveId();
      if (firstId) {
        lastActiveId = firstId;
        setActive(firstId);
      }
    }, 0);

    // Listeners
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      recomputePositions();
      onScroll();
    });
    window.addEventListener("load", () => {
      recomputePositions();
      onScroll();
    });

    // Expose cleanup handle for PJAX swaps
    try {
      if (window.__pochiScrollSpy && window.__pochiScrollSpy.disconnect)
        window.__pochiScrollSpy.disconnect();
    } catch (_) {}
    window.__pochiScrollSpy = {
      disconnect: () => {
        window.removeEventListener("scroll", onScroll);
      },
    };
  }

  function boot() {
    try {
      init();
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Re-initialize after PJAX swaps
  document.addEventListener("pochi:afterSwap", boot);
})();
