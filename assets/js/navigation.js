// Lightweight PJAX-style navigation with prefetch and View Transitions
// - Prefetch internal links on hover/touch
// - Intercept clicks to replace only the main content area
// - Update history and document title
// - Re-run page-level initializers from main.js (buildTableOfContents, initSearch)

(function () {
  const CACHE = new Map(); // url -> Promise<string> (HTML)
  // Feature toggle: set to true to enable View Transitions animations
  const ENABLE_VIEW_TRANSITIONS = false;
  const SUPPORTS_VT =
    ENABLE_VIEW_TRANSITIONS &&
    typeof document.startViewTransition === "function";

  function isInternalLink(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== "") return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.href === location.href) return false;
    if (url.hash && url.pathname === location.pathname) return false; // in-page anchor
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    if (rel.includes("external") || rel.includes("nofollow")) return false;
    const download = a.hasAttribute("download");
    if (download) return false;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    return true;
  }

  function fetchHTML(url) {
    const key = typeof url === "string" ? url : url.href;
    if (CACHE.has(key)) return CACHE.get(key);
    const p = fetch(key, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .catch((err) => {
        // On failure, ensure cache does not poison next attempts
        CACHE.delete(key);
        throw err;
      });
    CACHE.set(key, p);
    return p;
  }

  function parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  }

  function clearPreviousPjaxPreloads() {
    const nodes = document.head.querySelectorAll('link[data-pjax-preload="true"]');
    nodes.forEach((n) => n.remove());
  }

  function adoptImagePreloads(nextDoc) {
    if (!nextDoc) return;
    const head = nextDoc.head;
    if (!head) return;
    const links = head.querySelectorAll('link[rel="preload"][as="image"]');
    if (!links || links.length === 0) return;

    // Remove previously added preloads to avoid buildup across navigations
    clearPreviousPjaxPreloads();

    const existingKeys = new Set(
      Array.from(document.head.querySelectorAll('link[rel="preload"][as="image"]'))
        .map((l) => `${l.getAttribute("href") || ""}|${l.getAttribute("imagesrcset") || ""}`)
    );

    links.forEach((srcLink) => {
      const href = srcLink.getAttribute("href") || "";
      const imagesrcset = srcLink.getAttribute("imagesrcset") || "";
      const key = `${href}|${imagesrcset}`;
      if (existingKeys.has(key)) return;
      const l = document.createElement("link");
      l.setAttribute("rel", "preload");
      l.setAttribute("as", "image");
      if (href) l.setAttribute("href", href);
      if (imagesrcset) l.setAttribute("imagesrcset", imagesrcset);
      const imagesizes = srcLink.getAttribute("imagesizes");
      if (imagesizes) l.setAttribute("imagesizes", imagesizes);
      const typeHint = srcLink.getAttribute("type");
      if (typeHint) l.setAttribute("type", typeHint);
      const cross = srcLink.getAttribute("crossorigin");
      if (cross) l.setAttribute("crossorigin", cross);
      l.setAttribute("data-pjax-preload", "true");
      document.head.appendChild(l);
    });
  }

  function forceInstantScrollToTop() {
    // Bypass any CSS `scroll-behavior: smooth` and force immediate jump
    const el = document.scrollingElement || document.documentElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollTop = 0;
    // Safari fallback
    if (document.body) document.body.scrollTop = 0;
    // Restore previous inline style on next frame
    requestAnimationFrame(() => {
      el.style.scrollBehavior = prev || "";
    });
  }

  function getNextMain(doc) {
    // Theme uses .main-content as the primary content wrapper
    return doc.querySelector(".main-content");
  }

  function getNextHero(doc) {
    // Single pages may render hero before main-content
    return doc.querySelector(".parallax-container");
  }

  function getNextBreadcrumbsInfo(doc, nextMain) {
    // Returns { el, container, external } or null
    const crumb = doc.querySelector("#breadcrumbs");
    if (!crumb) return null;
    const external = nextMain ? !nextMain.contains(crumb) : true;
    const container = crumb.closest(".container-fluid") || crumb;
    return { el: crumb, container, external };
  }

  function swapContent(nextDoc, options) {
    const nextMain = getNextMain(nextDoc);
    const currentMain = document.querySelector(".main-content");
    if (!nextMain || !currentMain) return false;

    const nextHero = getNextHero(nextDoc);
    const currentHero = document.querySelector(".parallax-container");

    const nextCrumbsInfo = getNextBreadcrumbsInfo(nextDoc, nextMain);
    const currentCrumbEl = document.querySelector("#breadcrumbs");
    const currentCrumbsExternal =
      currentCrumbEl && currentMain
        ? !currentMain.contains(currentCrumbEl)
        : false;
    const currentCrumbsContainer = currentCrumbEl
      ? currentCrumbEl.closest(".container-fluid") || currentCrumbEl
      : null;

    const doSwap = () => {
      // Swap/insert/remove hero first to keep order stable
      if (nextHero) {
        const nextHeroNode = nextHero.cloneNode(true);
        if (currentHero) {
          currentHero.replaceWith(nextHeroNode);
        } else {
          currentMain.parentElement.insertBefore(nextHeroNode, currentMain);
        }
      } else if (currentHero) {
        currentHero.remove();
      }

      // Breadcrumbs handling:
      // - If current has external breadcrumbs, remove them first to avoid duplicates
      if (currentCrumbsExternal && currentCrumbsContainer) {
        currentCrumbsContainer.remove();
      }
      // - If next requires external breadcrumbs (i.e., not inside nextMain), insert before currentMain
      if (nextCrumbsInfo && nextCrumbsInfo.external) {
        const nextCrumbsNode = nextCrumbsInfo.container.cloneNode(true);
        currentMain.parentElement.insertBefore(nextCrumbsNode, currentMain);
      }

      // Then swap the main content
      const nextNode = nextMain.cloneNode(true);
      currentMain.replaceWith(nextNode);

      // Ensure above-the-fold images (hero) load immediately
      try {
        const hero = document.querySelector(".parallax-container");
        if (hero) {
          hero.querySelectorAll("img").forEach((img) => {
            img.setAttribute("loading", "eager");
            img.setAttribute("fetchpriority", "high");
          });
        }
      } catch (_) {}

      if (!options || options.scroll !== "preserve") {
        forceInstantScrollToTop();
      }
    };

    if (SUPPORTS_VT) {
      document.startViewTransition(doSwap);
    } else {
      doSwap();
    }

    return true;
  }

  function afterSwapInit() {
    try {
      // Functions declared in assets/js/main.js are global in classic scripts
      if (typeof buildTableOfContents === "function") buildTableOfContents();
      if (typeof initSearch === "function") initSearch();
      // Other global listeners (smoothScroll, toggleSideNav, theme) use document-level
      // delegation and remain active across swaps.
    } catch (_) {}
  }

  async function navigateTo(url, opts) {
    try {
      const html = await fetchHTML(url);
      const doc = parseHTML(html);
      // Adopt hero/eyecatch preloads from next document head so LCP stays fast
      adoptImagePreloads(doc);
      const ok = swapContent(doc, opts);
      if (!ok) throw new Error("Swap failed");
      // Update title
      const newTitle = doc.title;
      if (newTitle) document.title = newTitle;
      // Update history
      const href = typeof url === "string" ? url : url.href;
      if (!opts || opts.updateHistory !== false) {
        history.pushState({}, "", href);
      }
      afterSwapInit();
    } catch (e) {
      // Fallback to full navigation on error
      const href = typeof url === "string" ? url : url.href;
      window.location.href = href;
    }
  }

  // Prefetch on hover/touchstart
  function setupPrefetching() {
    const handler = (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      if (!isInternalLink(a)) return;
      // Avoid overfetching pagination hover storms by slight delay
      const url = new URL(a.href, location.href);
      setTimeout(() => fetchHTML(url.href).catch(() => {}), 40);
    };
    document.addEventListener("mouseover", handler, { passive: true });
    document.addEventListener("touchstart", handler, { passive: true });
  }

  function setupClickNavigation() {
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // left click only
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      if (!isInternalLink(a)) return;
      e.preventDefault();
      const url = new URL(a.href, location.href);
      navigateTo(url.href);
    });
  }

  function setupPopState() {
    window.addEventListener("popstate", () => {
      // On back/forward, load and replace without pushing history again
      navigateTo(location.href, { updateHistory: false, scroll: "preserve" });
    });
  }

  function init() {
    setupPrefetching();
    setupClickNavigation();
    setupPopState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
