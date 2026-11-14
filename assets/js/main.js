function smoothScroll() {
  const scrollToTopBtn =
    document.querySelector("[data-pochi-scroll-top]") ||
    document.getElementById("scroll-to-top");

  // Scroll to the target and move focus there, as a native in-page link
  // would (the skip link relies on it). html's scroll-padding keeps the target
  // clear of the fixed nav bar. The URL hash is left alone: changing it fires
  // popstate, which navigation.js answers by reloading the page.
  function scrollToTarget(targetEl) {
    if (!targetEl) return; // guard missing target
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    targetEl.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    if (
      !targetEl.matches("a[href], button, input, select, textarea, [tabindex]")
    ) {
      targetEl.setAttribute("tabindex", "-1");
    }
    targetEl.focus({ preventScroll: true });
  }

  function handleLinkClick(event) {
    // Accept clicks on child elements inside <a> as well
    const anchor =
      event.target && event.target.closest
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
        targetEl = document.getElementById(href.slice(1));
      } catch (_) {}
      scrollToTarget(targetEl);
      // A heading's own link is there to give the section's URL, so it
      // goes in the address bar. replaceState does not fire popstate.
      if (targetEl && anchor.classList.contains("heading-anchor")) {
        history.replaceState(history.state, "", href);
      }
    }
  }

  // Add a single click event listener on the parent, and delegate events to children
  document.addEventListener("click", (event) => {
    // Delegate to the nearest anchor so clicks on child elements also work
    const anchor =
      event.target && event.target.closest
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

// The side nav is a modal <dialog>. showModal() traps focus, makes the page
// behind it inert and handles Escape; on close the browser puts focus back on
// the menu button.
function toggleSideNav() {
  const sideNav =
    document.querySelector("[data-pochi-side-nav]") ||
    document.querySelector("#side-nav");
  const toggleBtn =
    document.querySelector("[data-pochi-menu-button]") ||
    document.getElementById("menu-bar-btn");

  if (!sideNav || typeof sideNav.showModal !== "function") return;

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (sideNav.open) return;
      sideNav.showModal();
      toggleBtn.setAttribute("aria-expanded", "true");
    });
  }

  // Covers every way it closes: the close button, a link, Escape, the backdrop
  sideNav.addEventListener("close", () => {
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  });

  sideNav.addEventListener("click", (event) => {
    const target = event.target;
    // A click on the backdrop lands on the dialog itself, outside its box
    if (target === sideNav) {
      const r = sideNav.getBoundingClientRect();
      const inside =
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom;
      if (!inside) sideNav.close();
      return;
    }
    // Close on the close button and on links (navigation.js or the browser
    // follows the link)
    if (target.closest("[data-pochi-side-nav-close], #side-nav-close, a")) {
      sideNav.close();
    }
  });
}

// Theme: "system" (no stored choice, follows the OS), "light" or "dark".
// The head script applies the stored choice before the CSS loads; these keep
// <html>, the toggle and the browser UI (theme-color) in step afterwards.
const THEME_PREFS = ["system", "light", "dark"];
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");

function getThemePref() {
  const pref = document.documentElement.getAttribute("data-theme-pref");
  return THEME_PREFS.includes(pref) ? pref : "system";
}

function applyTheme(pref) {
  const root = document.documentElement; // keep in sync with head FOUC script
  const isDark = pref === "system" ? !!prefersDark?.matches : pref === "dark";
  root.setAttribute("data-theme-pref", pref);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);

  const themeSwitch =
    document.querySelector("[data-pochi-theme-toggle]") ||
    document.getElementById("theme-toggle-switch");
  const label = themeSwitch?.getAttribute(`data-label-${pref}`);
  if (label) themeSwitch.setAttribute("aria-label", label);

  syncThemeColor(pref);

  // Sync Giscus theme to match site theme
  try {
    if (typeof updateGiscusThemeWithRetry === "function") {
      updateGiscusThemeWithRetry();
    }
  } catch (_) {}
}

// The theme-color metas carry one color per OS scheme (media queries). A
// chosen theme overrides the OS, so both get that theme's color; "system"
// puts the originals back.
function syncThemeColor(pref) {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((meta) => {
    if (!meta.hasAttribute("data-pochi-color")) {
      meta.setAttribute("data-pochi-color", meta.content);
    }
  });
  const colorFor = (scheme) =>
    Array.from(metas)
      .find((m) => m.media.includes(scheme))
      ?.getAttribute("data-pochi-color");
  metas.forEach((meta) => {
    const color =
      pref === "system"
        ? meta.getAttribute("data-pochi-color")
        : colorFor(pref);
    if (color) meta.content = color;
  });
}

function toggleTheme() {
  const themeSwitch =
    document.querySelector("[data-pochi-theme-toggle]") ||
    document.getElementById("theme-toggle-switch");
  if (!themeSwitch) return;

  applyTheme(getThemePref());

  themeSwitch.addEventListener("click", () => {
    const current = getThemePref();
    const next =
      THEME_PREFS[(THEME_PREFS.indexOf(current) + 1) % THEME_PREFS.length];
    try {
      if (next === "system") localStorage.removeItem("pref-theme");
      else localStorage.setItem("pref-theme", next);
    } catch (_) {}

    const doToggle = () => applyTheme(next);
    const vtEnabled =
      document.body?.getAttribute("data-view-transitions") === "true";
    if (vtEnabled && typeof document.startViewTransition === "function") {
      document.startViewTransition(doToggle);
    } else {
      doToggle();
    }
  });
}

// OS changes matter only while following the system; nothing is stored
function handleThemeChange() {
  if (!prefersDark || !prefersDark.addEventListener) return;
  prefersDark.addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
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
        announceResults(result.length);
        if (result.length > 0) {
          populateResults(result);
        } else {
          var resultsEl = document.getElementById("search-results");
          var noResultsText =
            (resultsEl && resultsEl.getAttribute("data-i18n-no-results")) ||
            "No matches found";
          if (resultsEl) {
            var emptyParagraph = document.createElement("p");
            emptyParagraph.className = "search-results-empty";
            emptyParagraph.textContent = noResultsText;
            resultsEl.innerHTML = "";
            resultsEl.appendChild(emptyParagraph);
          }
        }
        hide(document.querySelector(".search-loading"));
      })
      .catch(function (err) {
        console.log("Fetch Error :-S", err);
      });
  });
}

// Read the number of results out through the role="status" element
function announceResults(count) {
  var status = document.getElementById("search-status");
  if (!status) return;
  if (count === 0) {
    var resultsEl = document.getElementById("search-results");
    status.textContent =
      (resultsEl && resultsEl.getAttribute("data-i18n-no-results")) ||
      "No matches found";
    return;
  }
  var template = status.getAttribute("data-i18n-results") || "%d results";
  status.textContent = template.replace("%d", String(count));
}

function populateResults(results) {
  var searchQuery = document.getElementById("search-query").value;
  var searchResults = document.getElementById("search-results");

  // pull template from hugo template definition
  var templateDefinition = document.getElementById(
    "search-result-template",
  ).innerHTML;

  var html = "";
  results.forEach(function (value, key) {
    var snippet = value.item.summary;

    html += render(templateDefinition, {
      key: key,
      title: value.item.title,
      link: value.item.permalink,
      publishDate: value.item.publishDate.split("T")[0],
      lastmod: value.item.lastmod.split("T")[0],
      snippet: snippet,
    });
  });
  searchResults.innerHTML = html;

  results.forEach(function (value, key) {
    var instance = new Mark(document.getElementById("summary-" + key));
    instance.mark(searchQuery);
  });
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
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
    templateString = templateString.replace(re, escapeHtml(data[key]));
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

// Dropdowns in the top nav follow the disclosure pattern (WAI-ARIA APG):
// the button next to a parent link shows or hides its list. PJAX replaces
// the menu's contents, so the listeners sit on the list itself.
function initDropdowns() {
  const menu = document.getElementById("menu-global-nav");
  if (!menu) return;

  const toggles = () => menu.querySelectorAll("[data-pochi-dropdown-toggle]");
  const setOpen = (toggle, open) =>
    toggle.setAttribute("aria-expanded", open ? "true" : "false");

  menu.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-pochi-dropdown-toggle]");
    if (!toggle) return;
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggles().forEach((t) => setOpen(t, false));
    setOpen(toggle, open);
  });

  // Escape closes the list and puts focus back on its button
  menu.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const dropdown = e.target.closest(".dropdown");
    const toggle = dropdown?.querySelector("[data-pochi-dropdown-toggle]");
    if (!toggle || toggle.getAttribute("aria-expanded") !== "true") return;
    e.preventDefault();
    setOpen(toggle, false);
    toggle.focus();
  });

  // Close when focus leaves the dropdown
  menu.addEventListener("focusout", (e) => {
    const dropdown = e.target.closest(".dropdown");
    if (!dropdown || dropdown.contains(e.relatedTarget)) return;
    const toggle = dropdown.querySelector("[data-pochi-dropdown-toggle]");
    if (toggle) setOpen(toggle, false);
  });
}

// Intercept search form submission to use PJAX navigation (enables View Transitions)
function handleSearchFormSubmit(e) {
  var form = e.target.closest("#searchform");
  if (!form || !window.__pochiNavigate) return;
  e.preventDefault();
  var params = new URLSearchParams(new FormData(form)).toString();
  var action = form.getAttribute("action");
  // Allow only safe relative paths
  if (!action || !/^\/[0-9A-Za-z/_\-]*$/.test(action)) return;
  // Ensure trailing slash for Hugo pretty URLs
  if (!action.endsWith("/")) action += "/";
  var url = action + "?" + params;
  window.__pochiNavigate(url);
}

function setupSearchFormPjax() {
  document.addEventListener("submit", handleSearchFormSubmit);
}

onReady(() => {
  smoothScroll();
  toggleSideNav();
  toggleTheme();
  handleThemeChange();
  initSearch();
  initDropdowns();
  setupSearchFormPjax();
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
