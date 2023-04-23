function smoothScroll() {
  const scrollToTopBtn = document.getElementById("scroll-to-top");

  function scrollToTarget(targetEl) {
    window.scrollTo({
      top: targetEl.offsetTop - 15,
      behavior: "smooth",
    });
  }

  function handleLinkClick(event) {
    event.preventDefault();

    const href = event.target.getAttribute("href");
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const targetEl = document.querySelector(href);
      scrollToTarget(targetEl);
    }
  }

  // Add a single click event listener on the parent, and delegate events to children
  document.addEventListener("click", (event) => {
    if (event.target.matches('a[href*="#"]')) {
      handleLinkClick(event);
    }
  });

  document.addEventListener("scroll", () => {
    if (window.scrollY >= 500) {
      scrollToTopBtn.classList.add("fade-in");
    } else {
      scrollToTopBtn.classList.remove("fade-in");
    }
  });
}

function toggleSideNav() {
  const sideNav = document.querySelector("#side-nav");
  const menuIcon = ".icon-menu";
  const isActiveClass = "is-active";

  let sideNavOverlay;
  let isSideNavOpen = false;

  document.addEventListener("click", (event) => {
    if (!isSideNavOpen && event.target.closest(menuIcon)) {
      isSideNavOpen = true;
      sideNav.style.cssText = `
        opacity: 1;
      `;
      sideNav.classList.add(isActiveClass);
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div id="side-nav-overlay"></div>'
      );
      sideNavOverlay = document.querySelector("#side-nav-overlay");
    }

    if (isSideNavOpen && event.target === sideNavOverlay) {
      isSideNavOpen = false;
      sideNav.style.cssText = `
        opacity: 0;
      `;
      sideNav.classList.remove(isActiveClass);
      sideNavOverlay.style.opacity = "0";
      setTimeout(() => sideNavOverlay.remove(), 300);
    }
  });
}

function toggleTheme() {
  document
    .getElementById("theme-toggle-switch")
    .addEventListener("click", () => {
      if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
        localStorage.setItem("pref-theme", "light");
      } else {
        document.body.classList.add("dark");
        localStorage.setItem("pref-theme", "dark");
      }
    });
}

function buildTableOfContents() {
  // Check if the page has a class named 'single-page'
  if (document.querySelector(".single-page") !== null) {
    // Get the first h2 element under the #contents element
    var firstH2 = document.querySelector("#contents h2");
    if (firstH2 === null) {
      return;
    }
    // Create the table of contents structure
    var tableOfContents =
      '<div class="index-outline"><p><span>記事内目次</span></p><ol>';
    // Initialize variables to help determine heading level and number
    var level = 0;
    var currentLevel = 0;
    var h2Number = 0;
    var h3Number = 0;
    var h4Number = 0;
    var headingNumber = 0;

    // Select all h2, h3, and h4 elements within the article element
    var headings = document.querySelectorAll(
      "article h2, article h3, article h4"
    );

    // Loop through each heading element
    for (var i = 0; i < headings.length; i++) {
      // Determine the heading level based on the tag name
      if (headings[i].tagName === "H2") {
        level = 0;
      } else if (headings[i].tagName === "H3") {
        level = 1;
      } else if (headings[i].tagName === "H4") {
        level = 2;
      }

      // Check if the heading level has increased or decreased since the previous iteration
      if (currentLevel < level) {
        tableOfContents += "<li><ol>";
        currentLevel = level;
      } else if (currentLevel > level) {
        tableOfContents += "</ol></li>";
        currentLevel = level;
      }

      // Increment the heading number based on the heading level
      switch (level) {
        case 0:
          h2Number++;
          headingNumber = h2Number;
          h3Number = 0;
          break;
        case 1:
          h3Number++;
          headingNumber = h2Number + "-" + h3Number;
          h4Number = 0;
          break;
        case 2:
          h4Number++;
          headingNumber = h2Number + "-" + h3Number + "-" + h4Number;
          break;
      }

      // Add an ID to the heading element and append its title to the TOC structure
      headings[i].setAttribute("id", "index-toc-" + i);
      tableOfContents +=
        '<li><a href="#index-toc-' +
        i +
        '">' +
        headingNumber +
        ". " +
        headings[i].textContent +
        "</a></li>";
    }

    // Finish building the table of contents structure
    tableOfContents += "</ol></div>";

    // Add the TOC to the page before the first h2 element
    firstH2.insertAdjacentHTML("beforebegin", tableOfContents);

    // Add the TOC to the sidebar
    var asideEl = document.createElement("aside");
    asideEl.innerHTML = tableOfContents;

    var sideBar = document.querySelector("#sidebar #side");
    sideBar.appendChild(asideEl);
  }
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
      { name: "title", weight: 0.45 },
      { name: "contents", weight: 0.4 },
      { name: "tags", weight: 0.1 },
      { name: "categories", weight: 0.05 },
    ],
  };

  show(document.querySelector(".search-loading"));

  fetch("/index.json").then(function (response) {
    if (response.status !== 200) {
      console.log(
        "Looks like there was a problem. Status Code: " + response.status
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

function populateResults(results) {
  var searchQuery = document.getElementById("search-query").value;
  var searchResults = document.getElementById("search-results");

  // pull template from hugo template definition
  var templateDefinition = document.getElementById(
    "search-result-template"
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
      featuredImage: value.item.featuredImage,
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
    (location.search.split(name + "=")[1] || "").split("&")[0]
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
  buildTableOfContents();
  initSearch();
});
