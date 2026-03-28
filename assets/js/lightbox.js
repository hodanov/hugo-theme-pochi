// Lightbox — click-to-expand for article images
// Uses event delegation on document so it survives PJAX swaps.

(function () {
  var overlay = null;
  var previousFocus = null;
  var fallbackTimer = null;

  function isSVG(img) {
    var src = img.currentSrc || img.src || "";
    return /\.svgz?(\?|$)/i.test(src);
  }

  function getFadeDuration(el) {
    var raw = getComputedStyle(el).transitionDuration;
    var seconds = parseFloat(raw) || 0;
    return seconds * 1000;
  }

  function open(img) {
    previousFocus = document.activeElement;

    var src = img.currentSrc || img.src;
    var alt = img.getAttribute("alt") || "";

    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", alt || "Image preview");

    var closeBtn = document.createElement("button");
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\u00d7";
    overlay.appendChild(closeBtn);

    var expanded = document.createElement("img");
    expanded.src = src;
    if (alt) expanded.alt = alt;
    overlay.appendChild(expanded);

    if (alt) {
      var caption = document.createElement("div");
      caption.className = "lightbox-caption";
      caption.textContent = alt;
      overlay.appendChild(caption);
    }

    document.body.appendChild(overlay);
    // Force reflow then add visible class for fade-in
    overlay.offsetWidth; // eslint-disable-line no-unused-expressions
    overlay.classList.add("is-visible");

    closeBtn.focus();

    document.addEventListener("keydown", onKey);
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener("keydown", onKey);
    overlay.classList.remove("is-visible");
    var el = overlay;
    overlay = null;

    var duration = getFadeDuration(el) + 50;

    el.addEventListener(
      "transitionend",
      function () {
        clearTimeout(fallbackTimer);
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      { once: true },
    );
    // Fallback if transitionend doesn't fire
    fallbackTimer = setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration);

    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    // Focus trap: only the close button is interactive
    if (e.key === "Tab" && overlay) {
      var closeBtn = overlay.querySelector(".lightbox-close");
      if (closeBtn) {
        e.preventDefault();
        closeBtn.focus();
      }
    }
  }

  // Delegate click on article images
  document.addEventListener("click", function (e) {
    // Close overlay on any click inside it (background, image, or close button)
    if (overlay) {
      close();
      return;
    }

    // Open lightbox for article images
    var img = e.target;
    if (img.tagName !== "IMG") return;
    // Only match images inside article content (not hero, cards, etc.)
    if (!img.closest("article picture")) return;
    // Exclude hero/svg images
    if (img.closest(".hero.featured-image-wrapper")) return;
    if (isSVG(img)) return;

    e.preventDefault();
    open(img);
  });
})();
