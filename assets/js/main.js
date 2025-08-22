function smoothScroll() {
  const scrollToTopBtn = document.getElementById("scroll-to-top");

  function scrollToTarget(targetEl) {
    window.scrollTo({
      top: targetEl.offsetTop - 15,
      behavior: "smooth",
    });
  }

  function handleLinkClick(event) {
    const target = event.target;
    if (!target || !target.getAttribute) return;
    const href = target.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    event.preventDefault();
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      const targetEl = document.querySelector(href);
      scrollToTarget(targetEl);
    }
  }

  // Add a single click event listener on the parent, and delegate events to children
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (t && t.matches && t.matches('a[href*="#"]')) {
      handleLinkClick(event);
    }
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
  const sideNav = document.querySelector("#side-nav");
  const toggleBtn = document.getElementById("menu-bar-btn");
  const isActiveClass = "is-active";

  let sideNavOverlay;
  let isSideNavOpen = false;

  if (!sideNav) return;

  // Initialize ARIA hidden state
  sideNav.setAttribute("aria-hidden", "true");

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
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="side-nav-overlay"></div>',
    );
    sideNavOverlay = document.querySelector("#side-nav-overlay");
  };

  const closeSideNav = (opts) => {
    if (!isSideNavOpen) return;
    isSideNavOpen = false;
    sideNav.style.cssText = `
      opacity: 0;
    `;
    sideNav.classList.remove(isActiveClass);
    sideNav.setAttribute("aria-hidden", "true");
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
      event.target.closest("#menu-bar-btn")
    ) {
      // Handled by the button's listener; no-op here
    }

    // Close the side nav when a link inside it is clicked
    const linkInsideSideNav = event.target.closest
      ? event.target.closest("#side-nav a")
      : null;
    // Close when the explicit close button is clicked
    const closeBtn = event.target.closest
      ? event.target.closest("#side-nav-close")
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
  const themeSwitch = document.getElementById("theme-toggle-switch");
  if (!themeSwitch) return;
  themeSwitch.addEventListener("click", () => {
    const root = document.documentElement; // keep in sync with head FOUC script
    const isDarkMode = root.classList.contains("dark");
    const next = isDarkMode ? "light" : "dark";
    root.classList.toggle("dark");
    localStorage.setItem("pref-theme", next);
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
    tokenize: true,
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
          document.getElementById("search-results").innerHTML =
            '<p class="search-results-empty">No matches found</p>';
        }
        hide(document.querySelector(".search-loading"));
      })
      .catch(function (err) {
        console.log("Fetch Error :-S", err);
      });
  });
}

// urlExists() returns 'true' if the request was successful, 'false' if it was a 404.
function urlExists(url) {
  let http = new XMLHttpRequest();
  http.open("HEAD", url, false);
  http.send();
  if (http.status != 404) return true;
  else return false;
}

// TODO: Implement a makeFeaturedImageContainer.
function makeFeaturedImageContainer(featuredImageURL) {
  let container = "";
  if (featuredImageURL !== "") {
    const fileExtension = featuredImageURL.match(
      /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i,
    )[0];
    const isAVIF = fileExtension === ".avif";
    const isWebP = fileExtension === ".webp";
    let imgSrc = "";
    let srcTag = "";

    if (isAVIF || isWebP) {
      const type = isAVIF ? "avif" : "webp";
      srcTag = `<source srcset="${featuredImageURL}" type="image/${type}" />`;

      const jpgPath = featuredImageURL.replace(
        /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i,
        ".jpg",
      );
      const pngPath = featuredImageURL.replace(
        /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i,
        ".png",
      );

      if (urlExists(jpgPath)) {
        imgSrc = jpgPath;
      } else if (urlExists(pngPath)) {
        imgSrc = pngPath;
      }
    } else {
      imgSrc = featuredImageURL;
    }

    const imgTag = `<img src="${imgSrc}" alt="" loading="lazy" decoding="async" />`;
    container = `<div class="post-image-col"><div class="featured-image-wrapper"><picture>${srcTag}${imgTag}</picture></div></div>`;
  }

  return container;
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
      // featuredImage: makeFeaturedImageContainer("/" + value.item.featuredImage),
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
});
