// Lightweight PJAX-style navigation with prefetch and View Transitions
// - Prefetch internal links on hover/touch
// - Intercept clicks to replace only the main content area
// - Update history and document title
// - Re-run page-level initializers from main.js (e.g., initSearch)

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

  // Sync critical <head> metadata with the next document
  // - Whitelist replacement for SEO/UX relevant tags
  // - Avoid touching analytics or app bootstrap scripts
  function syncHead(nextDoc) {
    if (!nextDoc || !nextDoc.head) return;

    const currentHead = document.head;
    const nextHead = nextDoc.head;

    // Update <html> attributes that may vary (e.g., lang)
    const nextHtml = nextDoc.documentElement;
    if (nextHtml) {
      const nextLang = nextHtml.getAttribute("lang");
      if (nextLang) document.documentElement.setAttribute("lang", nextLang);
      const nextDir = nextHtml.getAttribute("dir");
      if (nextDir) document.documentElement.setAttribute("dir", nextDir);
    }

    // Helper to remove existing nodes matching selector from current head
    const removeAll = (selector) => {
      currentHead
        .querySelectorAll(selector)
        .forEach((n) => n.parentNode && n.parentNode.removeChild(n));
    };

    // Helper to clone from next head and append with a marker
    const adoptAll = (selector) => {
      nextHead.querySelectorAll(selector).forEach((src) => {
        const node = src.cloneNode(true);
        node.setAttribute("data-pjax-head", "true");
        currentHead.appendChild(node);
      });
    };

    // Replace canonical URL and pagination hints
    removeAll('link[rel="canonical"], link[rel="prev"], link[rel="next"]');
    adoptAll('link[rel="canonical"], link[rel="prev"], link[rel="next"]');

    // Replace standard meta description/keywords/robots/theme-color/author
    removeAll(
      [
        'meta[name="description"]',
        'meta[name="keywords"]',
        'meta[name="robots"]',
        'meta[name="author"]',
        'meta[name="theme-color"]',
      ].join(", "),
    );
    adoptAll(
      [
        'meta[name="description"]',
        'meta[name="keywords"]',
        'meta[name="robots"]',
        'meta[name="author"]',
        'meta[name="theme-color"]',
      ].join(", "),
    );

    // Replace Open Graph and Twitter Card metas
    removeAll(
      'meta[property^="og:"], meta[property^="article:"], meta[name^="twitter:"]',
    );
    adoptAll(
      'meta[property^="og:"], meta[property^="article:"], meta[name^="twitter:"]',
    );

    // Replace JSON-LD structured data only (leave other scripts alone)
    removeAll('script[type="application/ld+json"]');
    adoptAll('script[type="application/ld+json"]');
  }

  // Replace header elements that depend on the current page/language
  // without re-mounting the entire header (keeps global listeners intact).
  function syncHeaderUI(nextDoc) {
    if (!nextDoc) return;
    try {
      // Update top language switcher
      const nextLangSwitcher = nextDoc.getElementById(
        "lang-switcher-container",
      );
      const curLangSwitcher = document.getElementById(
        "lang-switcher-container",
      );
      if (nextLangSwitcher && curLangSwitcher) {
        curLangSwitcher.innerHTML = nextLangSwitcher.innerHTML;
      }

      // Update top global nav menu items
      const nextTopMenu = nextDoc.getElementById("menu-global-nav");
      const curTopMenu = document.getElementById("menu-global-nav");
      if (nextTopMenu && curTopMenu) {
        curTopMenu.innerHTML = nextTopMenu.innerHTML;
      }

      // Update side nav menu items
      const nextSideMenu = nextDoc.getElementById("menu-global-nav-for-phone");
      const curSideMenu = document.getElementById("menu-global-nav-for-phone");
      if (nextSideMenu && curSideMenu) {
        curSideMenu.innerHTML = nextSideMenu.innerHTML;
      }

      // Update side nav options area (contains language switcher)
      const nextSideOption = nextDoc.getElementById("side-nav-option");
      const curSideOption = document.getElementById("side-nav-option");
      if (nextSideOption && curSideOption) {
        curSideOption.innerHTML = nextSideOption.innerHTML;
      }
    } catch (_) {
      // Non-fatal; fall back to existing header UI.
    }
  }

  function clearPreviousPjaxPreloads() {
    const nodes = document.head.querySelectorAll(
      'link[data-pjax-preload="true"]',
    );
    nodes.forEach((n) => n.remove());
  }

  // Reconcile <link rel="preload" as="image"> between current document and next document.
  // - Remove previously injected PJAX preloads
  // - Remove stale SSR preloads from the current head that are not present in the next head
  // - Add missing preloads from the next head and mark them as managed (data-pjax-preload)
  function adoptImagePreloads(nextDoc) {
    if (!nextDoc) return;
    const head = nextDoc.head;
    if (!head) return;
    const nextLinks = Array.from(
      head.querySelectorAll('link[rel="preload"][as="image"]'),
    );

    // Compute target key set from next document
    const targetKeys = new Set(
      nextLinks.map(
        (l) =>
          `${l.getAttribute("href") || ""}|${l.getAttribute("imagesrcset") || ""}`,
      ),
    );

    // 1) Remove any previously injected preloads
    clearPreviousPjaxPreloads();

    // 2) Remove stale SSR preloads that are not in the next head
    Array.from(
      document.head.querySelectorAll('link[rel="preload"][as="image"]'),
    ).forEach((l) => {
      const key = `${l.getAttribute("href") || ""}|${l.getAttribute("imagesrcset") || ""}`;
      // If this preload is not needed for the next page, drop it
      if (!targetKeys.has(key)) l.remove();
    });

    // 3) Add missing preloads from the next head
    const existingAfterCleanup = new Set(
      Array.from(
        document.head.querySelectorAll('link[rel="preload"][as="image"]'),
      ).map(
        (l) =>
          `${l.getAttribute("href") || ""}|${l.getAttribute("imagesrcset") || ""}`,
      ),
    );

    nextLinks.forEach((srcLink) => {
      const href = srcLink.getAttribute("href") || "";
      const imagesrcset = srcLink.getAttribute("imagesrcset") || "";
      const key = `${href}|${imagesrcset}`;
      if (existingAfterCleanup.has(key)) return;
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
    // Theme uses exactly one .main-content as the primary content wrapper
    const mains = doc.querySelectorAll(".main-content");
    if (mains.length !== 1) return null;
    return mains[0];
  }

  function getNextHero(doc) {
    // Single pages may render hero before main-content
    return doc.querySelector(".parallax-container");
  }

  function swapContent(nextDoc, options) {
    const nextMain = getNextMain(nextDoc);
    const currentMains = document.querySelectorAll(".main-content");
    const currentMain = currentMains.length === 1 ? currentMains[0] : null;
    if (!nextMain || !currentMain) return false;

    const nextHero = getNextHero(nextDoc);
    const currentHero = document.querySelector(".parallax-container");

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
      if (typeof initSearch === "function") initSearch();
      // Other global listeners (smoothScroll, toggleSideNav, theme) use document-level
      // delegation and remain active across swaps.
    } catch (_) {}

    // Re-initialize Google AdSense after PJAX swap
    // - Inline <script>(adsbygoogle...).push({})</script> inside content will not execute
    //   when DOM is swapped via clone/replace, so we need to trigger it manually.
    // - Ensure loader script exists once; if missing (e.g., navigated from a page without
    //   AdSense), inject it using data-ad-client from the first ad unit.
    try {
      (function initAdSense() {
        const adUnits = document.querySelectorAll(
          'ins.adsbygoogle:not([data-adsbygoogle-status])',
        );
        if (adUnits.length === 0) return; // nothing to do

        // Ensure loader exists (added on first article load normally; PJAX may skip head include)
        const hasLoader = !!document.querySelector(
          'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
        );

        function renderPendingUnits() {
          try {
            // Initialize each pending unit. The library consumes the next pending <ins> per push.
            window.adsbygoogle = window.adsbygoogle || [];
            adUnits.forEach(() => {
              try {
                window.adsbygoogle.push({});
              } catch (_) {}
            });
          } catch (_) {}
        }

        if (hasLoader && window.adsbygoogle) {
          renderPendingUnits();
          return;
        }

        // Inject loader using client from the first ad unit if available
        const firstWithClient = document.querySelector(
          'ins.adsbygoogle[data-ad-client]'
        );
        if (!hasLoader && firstWithClient) {
          const client = firstWithClient.getAttribute('data-ad-client');
          if (client) {
            const s = document.createElement('script');
            s.async = true;
            s.src =
              'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
              encodeURIComponent(client);
            s.crossOrigin = 'anonymous';
            s.addEventListener('load', renderPendingUnits, { once: true });
            document.head.appendChild(s);
            // Fallback: also try a delayed render in case onload didn’t fire
            setTimeout(renderPendingUnits, 1200);
            return;
          }
        }

        // Last resort: if loader might be present but not ready yet, try a short delay
        setTimeout(renderPendingUnits, 400);
      })();
    } catch (_) {}
  }

  async function navigateTo(url, opts) {
    try {
      const html = await fetchHTML(url);
      const doc = parseHTML(html);
      // Adopt hero/eyecatch preloads from next document head so LCP stays fast
      adoptImagePreloads(doc);
      // Sync head metadata and structured data for correctness
      syncHead(doc);
      // Sync header UI elements (language switcher, menus) that are language/page dependent
      syncHeaderUI(doc);
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
      // Fire virtual pageview for common analytics if available
      try {
        if (window.gtag) {
          // gtag.js: send page_view event with updated URL
          window.gtag("event", "page_view", {
            page_location: location.href,
            page_path: location.pathname,
            page_title: document.title,
          });
        } else if (window.ga) {
          // analytics.js
          window.ga("set", "page", location.pathname);
          window.ga("send", "pageview");
        }
      } catch (_) {}
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
