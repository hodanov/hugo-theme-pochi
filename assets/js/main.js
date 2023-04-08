function scrollSmoother() {
  var internalLinks = document.querySelectorAll('a[href*="#"]');
  for (let i = 0, len = internalLinks.length; i < len; i++) {
    internalLinks[i].addEventListener("click", (event) => {
      event.preventDefault();

      if (internalLinks[i].getAttribute("href") === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return false;
      } else {
        let targetEl = document.querySelector(internalLinks[i].hash);
        window.scrollTo({
          top: targetEl.offsetTop + 60,
          behavior: "smooth",
        });
      }
    });
  }

  // Scroll to top
  var scrollToTopBtn = document.querySelector("#scroll-to-top");
  window.addEventListener("scroll", () => {
    if (window.scrollY >= 500) {
      scrollToTopBtn.classList.add("fade-in");
    } else {
      scrollToTopBtn.classList.remove("fade-in");
    }
  });
}

function sideNavBtnToggle() {
  const sideNav = document.querySelector("#side-nav");
  const sideNavOverlayDiv = '<div id="sidenav-overlay"></div>';
  const sideNavOn = "side-nav-on";
  var isSideNavOn = false;
  document.addEventListener(
    "touchstart",
    function (event) {
      if (
        !isSideNavOn &&
        event.target.closest("nav #menu-bar-btn .icon-menu")
      ) {
        isSideNavOn = true;
        Object.assign(sideNav.style, {
          transform: "translateX(0)",
          opacity: "1",
        });
        sideNav.classList.add(sideNavOn);
        document.body.insertAdjacentHTML("beforeend", sideNavOverlayDiv);
      }
      if (
        isSideNavOn &&
        event.target === document.querySelector("#sidenav-overlay")
      ) {
        isSideNavOn = false;
        Object.assign(sideNav.style, {
          transform: "translateX(-105%)",
          opacity: "0",
        });
        sideNav.classList.remove(sideNavOn);
        var sideNavOverlay = document.querySelector("#sidenav-overlay");
        Object.assign(sideNavOverlay.style, {
          opacity: "0",
        });
        // Wait time to prevent the trigger click event about elements under #sidenav-overlay.
        setTimeout(function () {
          sideNavOverlay.remove();
        }, 300);
      }
    },
    false
  );
}

function buildTableOfContents() {
  // Check if the page has a class named 'single-page'
  if (document.querySelector(".single-page") !== null) {
    // Get the first h2 element under the #contents element
    var firstH2 = document.querySelector("#contents h2");
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
  scrollSmoother();
  sideNavBtnToggle();
  buildTableOfContents();
});
