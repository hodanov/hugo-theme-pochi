// Delegate clicks so it keeps working across PJAX swaps
(function initArchivesToggleDelegation() {
  function onClick(e) {
    // Left sidebar year toggle
    const yearBtn =
      e.target && e.target.closest
        ? e.target.closest("#sidebar-left .archives-year-toggle")
        : null;
    if (yearBtn) {
      const year = yearBtn.getAttribute("data-year");
      if (!year) return;
      const target = document.getElementById(`archives-months-${year}`);
      if (!target) return;
      const isCollapsed = target.classList.toggle("is-collapsed");
      try {
        yearBtn.setAttribute("aria-expanded", (!isCollapsed).toString());
      } catch (_) {}
      return;
    }

    // Archives page month toggle (card view)
    const monthBtn =
      e.target && e.target.closest
        ? e.target.closest(".archive-month-toggle")
        : null;
    if (monthBtn) {
      const month = monthBtn.getAttribute("data-month");
      if (!month) return;
      showMonthCards(month, { scrollIntoView: false, updateHash: true });
    }
  }

  if (!document.__pochiArchivesDelegated) {
    document.addEventListener("click", onClick);
    document.__pochiArchivesDelegated = true;
  }

  function isArchivesPage() {
    return !!document.querySelector(".archive-year");
  }

  function openYearForMonth(monthKey) {
    const year = (monthKey || "").slice(0, 4);
    if (!year) return;
    const yearHeading = document.getElementById(year);
    if (!yearHeading) return;
    const details = yearHeading.closest("details.archive-year");
    if (details) details.open = true;
  }

  function showMonthCards(monthKey, opts) {
    if (!isArchivesPage()) return;
    openYearForMonth(monthKey);
    const all = document.querySelectorAll(".archive-month-cards");
    all.forEach((el) => el.classList.add("is-collapsed"));
    const target = document.getElementById(`cards-${monthKey}`);
    if (!target) return;
    target.classList.remove("is-collapsed");
    // Mark selected year to hide others in cards-only mode
    try {
      document
        .querySelectorAll("details.archive-year")
        .forEach((d) => d.classList.remove("is-selected-year"));
      const selectedYear = target.closest("details.archive-year");
      if (selectedYear) selectedYear.classList.add("is-selected-year");
    } catch (_) {}
    // Enter cards-only mode: hide headings and non-selected years
    try {
      const contents = document.getElementById("contents");
      if (contents) contents.classList.add("cards-only-mode");
    } catch (_) {}
    // Update aria-expanded on toggles
    document.querySelectorAll(".archive-month-toggle").forEach((b) => {
      const k = b.getAttribute("data-month");
      b.setAttribute("aria-expanded", k === monthKey ? "true" : "false");
    });
    if (opts && opts.updateHash) {
      try {
        history.replaceState({}, "", `#${monthKey}`);
      } catch (_) {}
    }
    if (opts && opts.scrollIntoView) {
      try {
        const h = document.getElementById(monthKey);
        if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (_) {}
    }
  }

  function showFromHash() {
    if (!isArchivesPage()) return;
    const hash = (location.hash || "").replace("#", "");
    if (/^\d{4}-\d{2}$/.test(hash)) {
      showMonthCards(hash, { scrollIntoView: true, updateHash: false });
    } else {
      // Collapse all by default on archives page
      document
        .querySelectorAll(".archive-month-cards")
        .forEach((el) => el.classList.add("is-collapsed"));
      document
        .querySelectorAll(".archive-month-toggle")
        .forEach((b) => b.setAttribute("aria-expanded", "false"));
      try {
        document
          .querySelectorAll("details.archive-year")
          .forEach((d) => d.classList.remove("is-selected-year"));
        const contents = document.getElementById("contents");
        if (contents) contents.classList.remove("cards-only-mode");
      } catch (_) {}
    }
  }

  // Initial run and listeners for hash changes and PJAX swaps
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showFromHash, { once: true });
  } else {
    showFromHash();
  }
  window.addEventListener("hashchange", showFromHash);
  document.addEventListener("pochi:afterSwap", showFromHash);
})();
