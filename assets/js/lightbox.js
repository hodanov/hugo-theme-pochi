// Lightbox — click-to-expand for article images
// Uses event delegation on document so it survives PJAX swaps.

(function () {
  var overlay = null;

  function isSVG(img) {
    var src = img.currentSrc || img.src || "";
    return /\.svgz?(\?|$)/i.test(src);
  }

  function open(img) {
    if (overlay) close();

    var src = img.currentSrc || img.src;
    var alt = img.getAttribute("alt") || "";

    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
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

    document.addEventListener("keydown", onKey);
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener("keydown", onKey);
    overlay.classList.remove("is-visible");
    var el = overlay;
    overlay = null;
    el.addEventListener("transitionend", function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    // Fallback if transitionend doesn't fire
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  // Delegate click on article images
  document.addEventListener("click", function (e) {
    // Close overlay when clicking background or close button
    if (overlay) {
      var target = e.target;
      if (
        target.classList.contains("lightbox-overlay") ||
        target.classList.contains("lightbox-close")
      ) {
        close();
      }
      return;
    }

    // Open lightbox for article images
    var img = e.target;
    if (img.tagName !== "IMG") return;
    // Only match images inside article content (not hero, cards, etc.)
    if (!img.closest("article picture")) return;
    // Exclude featured/hero images
    if (img.closest(".featured-image-wrapper")) return;
    if (isSVG(img)) return;

    e.preventDefault();
    open(img);
  });
})();
