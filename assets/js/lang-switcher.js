// Language switcher: navigate on selection change
// Uses event delegation so it works after PJAX DOM swaps without rebinding.
document.addEventListener("change", function (event) {
  var sel = event.target.closest("[data-pochi-lang-switcher]");
  if (!sel) return;
  var v = sel.value;
  if (!v) return;
  // Block absolute URLs (protocol schemes)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return;
  // Must start with /
  if (v.charAt(0) !== "/") return;
  // Allow only safe path characters
  if (!/^\/[0-9A-Za-z/_\-]*$/.test(v)) return;
  if (window.__pochiNavigate) {
    window.__pochiNavigate(v);
  } else {
    window.location.href = v;
  }
});
