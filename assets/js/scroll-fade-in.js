// Scroll-triggered fade-in animation for cards and related posts
(function () {
  const TARGET_SELECTOR = ".post-row, .related-posts .related-post-item";
  const STAGGER_MS = 100;
  const STAGGER_MAX_STEPS = 5;

  let observer = null;

  function isEnabled() {
    return document.body?.getAttribute("data-scroll-fade-in") === "true";
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function getTargets() {
    return Array.from(document.querySelectorAll(TARGET_SELECTOR));
  }

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function reveal(el, index) {
    if (!el) return;
    const delay = Math.min(index, STAGGER_MAX_STEPS) * STAGGER_MS;
    el.style.transitionDelay = delay > 0 ? delay + "ms" : "0s";
    el.classList.add("is-visible");
  }

  function revealImmediately(el) {
    if (!el) return;
    el.style.transitionDelay = "0s";
    el.classList.add("scroll-fade-in", "is-visible");
  }

  function isInInitialViewport(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return false;
    const rect = el.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    if (viewportHeight <= 0) return false;
    return rect.top < viewportHeight && rect.bottom > 0;
  }

  function init() {
    cleanup();

    if (!isEnabled()) return;

    const targets = getTargets();
    if (!targets.length) return;

    const reducedMotion = prefersReducedMotion();
    const supportsObserver = typeof window.IntersectionObserver === "function";

    if (reducedMotion || !supportsObserver) {
      targets.forEach((el) => revealImmediately(el));
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.target.getBoundingClientRect().top -
              b.target.getBoundingClientRect().top,
          );

        visibleEntries.forEach((entry, index) => {
          reveal(entry.target, index);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
      },
    );

    // Measure every card before marking any. Marking hides a card, and a
    // measurement after that commits the hidden style, so revealing the
    // card then would run the fade-in. After a PJAX swap that made the
    // cards already on screen rise. With no measurement between, a card on
    // screen goes straight to its revealed state.
    const onScreen = targets.map((el) => isInInitialViewport(el));
    targets.forEach((el, i) => {
      if (onScreen[i]) {
        revealImmediately(el);
        return;
      }
      el.classList.add("scroll-fade-in");
      observer.observe(el);
    });
  }

  function boot() {
    try {
      init();
    } catch (_) {}
  }

  window.__pochiScrollFadeIn = {
    init,
    cleanup,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  document.addEventListener("pochi:afterSwap", boot);
})();
