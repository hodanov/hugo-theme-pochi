function smoothScroll() {
  const scrollToTopBtn =
    document.querySelector("[data-pochi-scroll-top]") ||
    document.getElementById("scroll-to-top");

  function scrollToTarget(targetEl) {
    if (!targetEl) return; // guard missing target
    window.scrollTo({
      top: targetEl.offsetTop - 15,
      behavior: "smooth",
    });
  }

  function handleLinkClick(event) {
    // Accept clicks on child elements inside <a> as well
    const anchor = event.target && event.target.closest
      ? event.target.closest('a[href*="#"]')
      : event.target;
    if (!anchor || !anchor.getAttribute) return;
    const href = anchor.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    event.preventDefault();
    // Support both href="#" and href="#top" as "scroll to top"
    if (href === "#" || href === "#top") {
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      // If selector is invalid or element not found, fail gracefully
      let targetEl = null;
      try {
        targetEl = document.querySelector(href);
      } catch (_) {}
      scrollToTarget(targetEl);
    }
  }

  // Add a single click event listener on the parent, and delegate events to children
  document.addEventListener("click", (event) => {
    // Delegate to the nearest anchor so clicks on child elements also work
    const anchor = event.target && event.target.closest
      ? event.target.closest('a[href*="#"]')
      : null;
    if (anchor) handleLinkClick(event);
  });

  document.addEventListener("scroll", () => {
    if (!scrollToTopBtn) return;
    if (window.scrollY >= 500) {
      scrollToTopBtn.classList.add("fade-in");
    } else {
      scrollToTopBtn.classList.remove("fade-in");
    }
  });
}

function toggleSideNav() {
  const sideNav =
    document.querySelector("[data-pochi-side-nav]") ||
    document.querySelector("#side-nav");
  const toggleBtn =
    document.querySelector("[data-pochi-menu-button]") ||
    document.getElementById("menu-bar-btn");
  const isActiveClass = "is-active";

  let sideNavOverlay;
  let isSideNavOpen = false;

  if (!sideNav) return;

  // Manage focusability of elements inside the side nav when aria-hidden is true
  const focusableSelector = [
    "a[href]",
    "area[href]",
    'input:not([type="hidden"]):not([disabled])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "iframe",
    "object",
    "embed",
    '[contenteditable="true"]',
    "[tabindex]",
  ].join(",");

  const getFocusable = () =>
    Array.from(sideNav.querySelectorAll(focusableSelector));

  const disableFocusWithin = () => {
    getFocusable().forEach((el) => {
      // Store previous tabindex only once
      if (!el.hasAttribute("data-prev-tabindex")) {
        const prev = el.getAttribute("tabindex");
        el.setAttribute("data-prev-tabindex", prev !== null ? prev : "");
      }
      el.setAttribute("tabindex", "-1");
    });
  };

  const enableFocusWithin = () => {
    getFocusable().forEach((el) => {
      const prev = el.getAttribute("data-prev-tabindex");
      if (prev !== null) {
        if (prev === "") el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", prev);
        el.removeAttribute("data-prev-tabindex");
      } else {
        // If we didn't store anything, remove the forced -1 we might have set
        if (el.getAttribute("tabindex") === "-1")
          el.removeAttribute("tabindex");
      }
    });
  };

  // Initialize ARIA hidden state
  sideNav.setAttribute("aria-hidden", "true");
  // Ensure focusable elements are removed from tab order when hidden
  disableFocusWithin();

  // Ensure ARIA defaults
  if (toggleBtn) {
    if (!toggleBtn.hasAttribute("aria-controls")) {
      toggleBtn.setAttribute("aria-controls", "side-nav");
    }
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  const openSideNav = () => {
    if (isSideNavOpen) return;
    isSideNavOpen = true;
    sideNav.style.cssText = `
      opacity: 1;
    `;
    sideNav.classList.add(isActiveClass);
    sideNav.setAttribute("aria-hidden", "false");
    // Restore focusability when shown
    enableFocusWithin();
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="side-nav-overlay" data-pochi-side-nav-overlay></div>',
    );
    sideNavOverlay =
      document.querySelector("[data-pochi-side-nav-overlay]") ||
      document.querySelector("#side-nav-overlay");
  };

  const closeSideNav = (opts) => {
    if (!isSideNavOpen) return;
    isSideNavOpen = false;
    sideNav.style.cssText = `
      opacity: 0;
    `;
    sideNav.classList.remove(isActiveClass);
    sideNav.setAttribute("aria-hidden", "true");
    // Remove focusability when hidden
    disableFocusWithin();
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    if (sideNavOverlay) {
      sideNavOverlay.style.opacity = "0";
      setTimeout(() => sideNavOverlay && sideNavOverlay.remove(), 300);
    }
    if (opts && opts.returnFocus && toggleBtn) toggleBtn.focus();
  };

  // Open via explicit toggle button
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (isSideNavOpen) closeSideNav();
      else openSideNav();
    });
  }

  document.addEventListener("click", (event) => {
    // Open when the dedicated button (or its children) is clicked
    if (
      !isSideNavOpen &&
      event.target.closest &&
      (event.target.closest("[data-pochi-menu-button]") ||
        event.target.closest("#menu-bar-btn"))
    ) {
      // Handled by the button's listener; no-op here
    }

    // Close the side nav when a link inside it is clicked
    const linkInsideSideNav = event.target.closest
      ? event.target.closest("[data-pochi-side-nav] a, #side-nav a")
      : null;
    // Close when the explicit close button is clicked
    const closeBtn = event.target.closest
      ? event.target.closest("[data-pochi-side-nav-close], #side-nav-close")
      : null;
    if (isSideNavOpen && (linkInsideSideNav || closeBtn)) {
      closeSideNav({ returnFocus: true });
      // Do not prevent default; navigation.js or browser will handle navigation
      return;
    }

    // Close by clicking on overlay
    if (isSideNavOpen && event.target === sideNavOverlay) {
      closeSideNav({ returnFocus: true });
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isSideNavOpen) {
      closeSideNav({ returnFocus: true });
    }
  });
}

function toggleTheme() {
  const themeSwitch =
    document.querySelector("[data-pochi-theme-toggle]") ||
    document.getElementById("theme-toggle-switch");
  if (!themeSwitch) return;

  // Initialize aria-pressed to reflect current mode
  try {
    const isDarkInit = document.documentElement.classList.contains("dark");
    themeSwitch.setAttribute("aria-pressed", isDarkInit ? "true" : "false");
  } catch (_) {}
  themeSwitch.addEventListener("click", () => {
    const root = document.documentElement; // keep in sync with head FOUC script
    const isDarkMode = root.classList.contains("dark");
    const next = isDarkMode ? "light" : "dark";
    root.classList.toggle("dark");
    localStorage.setItem("pref-theme", next);
    // Update aria-pressed to reflect toggled state
    try {
      themeSwitch.setAttribute(
        "aria-pressed",
        next === "dark" ? "true" : "false",
      );
    } catch (_) {}

    // Sync Giscus theme to match site theme
    try {
      if (typeof updateGiscusThemeWithRetry === "function") {
        updateGiscusThemeWithRetry();
      }
    } catch (_) {}
  });
}

function handleThemeChange() {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  if (!prefersDarkMode || !prefersDarkMode.addEventListener) return;
  prefersDarkMode.addEventListener("change", (e) => {
    const root = document.documentElement;
    const isDark = e.matches;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("pref-theme", isDark ? "dark" : "light");
    // Keep toggle button state in sync when system preference changes
    try {
      const themeSwitch =
        document.querySelector("[data-pochi-theme-toggle]") ||
        document.getElementById("theme-toggle-switch");
      if (themeSwitch) {
        themeSwitch.setAttribute("aria-pressed", isDark ? "true" : "false");
      }
    } catch (_) {}

    // Also update Giscus theme when system preference changes
    try {
      if (typeof updateGiscusThemeWithRetry === "function") {
        updateGiscusThemeWithRetry();
      }
    } catch (_) {}
  });
}

// =============================
// Search
// =============================
function initSearch() {
  var inputBox = document.getElementById("search-query");
  if (inputBox !== null) {
    var searchQuery = param("q");
    if (searchQuery) {
      inputBox.value = searchQuery || "";
      executeSearch(searchQuery, false);
    }
  }
}

function executeSearch(searchQuery) {
  var fuseOptions = {
    shouldSort: true,
    includeMatches: true,
    includeScore: true,
    location: 0,
    distance: 100,
    minMatchCharLength: 2,
    keys: [
      { name: "title", weight: 0.5 },
      { name: "contents", weight: 0.35 },
      { name: "tags", weight: 0.1 },
      { name: "categories", weight: 0.05 },
    ],
  };

  show(document.querySelector(".search-loading"));

  // Resolve search index URL from template-provided data attribute
  var searchForm = document.getElementById("searchform");
  var indexURL =
    (searchForm && searchForm.getAttribute("data-index-url")) || "index.json";
  fetch(indexURL).then(function (response) {
    if (response.status !== 200) {
      console.log(
        "Looks like there was a problem. Status Code: " + response.status,
      );
      return;
    }
    // Examine the text in the response
    response
      .json()
      .then(function (pages) {
        var fuse = new Fuse(pages, fuseOptions);
        var result = fuse.search(searchQuery);
        if (result.length > 0) {
          populateResults(result);
        } else {
          var resultsEl = document.getElementById("search-results");
          var noResultsText =
            (resultsEl && resultsEl.getAttribute("data-i18n-no-results")) ||
            "No matches found";
          if (resultsEl) {
            resultsEl.innerHTML =
              '<p class="search-results-empty">' + noResultsText + "</p>";
          }
        }
        hide(document.querySelector(".search-loading"));
      })
      .catch(function (err) {
        console.log("Fetch Error :-S", err);
      });
  });
}

function populateResults(results) {
  var searchQuery = document.getElementById("search-query").value;
  var searchResults = document.getElementById("search-results");

  // pull template from hugo template definition
  var templateDefinition = document.getElementById(
    "search-result-template",
  ).innerHTML;

  results.forEach(function (value, key) {
    var snippet = value.item.summary;
    var snippetHighlights = [];
    snippetHighlights.push(searchQuery);

    var output = render(templateDefinition, {
      key: key,
      title: value.item.title,
      link: value.item.permalink,
      publishDate: value.item.publishDate.split("T")[0],
      lastmod: value.item.lastmod.split("T")[0],
      featuredImage: "",
      snippet: snippet,
    });
    searchResults.innerHTML += output;

    snippetHighlights.forEach(function (snipvalue, snipkey) {
      var instance = new Mark(document.getElementById("summary-" + key));
      instance.mark(snipvalue);
    });
  });
}

function render(templateString, data) {
  var conditionalMatches, conditionalPattern, copy;
  conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
  copy = templateString;
  while (
    (conditionalMatches = conditionalPattern.exec(templateString)) !== null
  ) {
    if (data[conditionalMatches[1]]) {
      //valid key, remove conditionals, leave contents.
      copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
    } else {
      //not valid, remove entire section
      copy = copy.replace(conditionalMatches[0], "");
    }
  }
  templateString = copy;
  //now any conditionals removed we can do simple substitution
  var key, find, re;
  for (key in data) {
    find = "\\$\\{\\s*" + key + "\\s*\\}";
    re = new RegExp(find, "g");
    templateString = templateString.replace(re, data[key]);
  }
  return templateString;
}

// Helper Functions
function show(elem) {
  elem.style.display = "block";
}
function hide(elem) {
  elem.style.display = "none";
}
function param(name) {
  return decodeURIComponent(
    (location.search.split(name + "=")[1] || "").split("&")[0],
  ).replace(/\+/g, " ");
}

const onReady = (callback) => {
  if (document.readyState != "loading") callback();
  else if (document.addEventListener)
    document.addEventListener("DOMContentLoaded", callback);
  else
    document.attachEvent("onreadystatechange", function () {
      if (document.readyState == "complete") callback();
    });
};

onReady(() => {
  smoothScroll();
  toggleSideNav();
  toggleTheme();
  handleThemeChange();
  initSearch();
  // Ensure Giscus theme matches current mode on initial load
  try {
    if (typeof updateGiscusThemeWithRetry === "function") {
      updateGiscusThemeWithRetry();
    }
  } catch (_) {}
});

// =============================
// Giscus Theme Sync
// =============================
function getSiteTheme() {
  try {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  } catch (_) {
    return "light";
  }
}

function updateGiscusTheme() {
  try {
    const frame = document.querySelector("iframe.giscus-frame");
    if (!frame || !frame.contentWindow) return false;

    // Avoid posting too early: when the iframe is just created but has not
    // navigated to https://giscus.app yet, its window temporarily inherits
    // the parent's origin (about:blank/same-origin). Posting to
    // "https://giscus.app" at that moment throws a SecurityError and pollutes
    // the console. Detect that state and bail until navigation completes.
    try {
      const loc = frame.contentWindow.location;
      // If we can read location and it's our own origin or about:blank,
      // the iframe hasn't navigated to giscus yet.
      if (
        !loc ||
        loc.href === "about:blank" ||
        loc.origin === "null" ||
        loc.origin === location.origin
      ) {
        return false;
      }
      // Optional sanity check: if src is present but not giscus, skip.
      const src = frame.getAttribute("src") || "";
      if (src) {
        try {
          const urlObj = new URL(src);
          if (urlObj.host !== "giscus.app") return false;
        } catch (_) {
          // If src is not a valid URL, treat as invalid.
          return false;
        }
      }
    } catch (_) {
      // Accessing contentWindow.location throws once the iframe is cross-origin,
      // which is exactly when it's safe to post to https://giscus.app.
    }

    const theme = getSiteTheme();
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme } } },
      "https://giscus.app",
    );
    return true;
  } catch (_) {
    return false;
  }
}

function updateGiscusThemeWithRetry() {
  let tries = 0;
  const maxTries = 30; // ~3s
  const id = setInterval(() => {
    if (updateGiscusTheme() || ++tries >= maxTries) clearInterval(id);
  }, 100);
}
