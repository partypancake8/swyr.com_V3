function updateHashDividers() {
  document.querySelectorAll("[data-hash-divider]").forEach((el) => {
    // Create test element to measure character width
    const test = document.createElement("span");
    test.style.visibility = "hidden";
    test.style.position = "absolute";
    test.style.fontFamily = getComputedStyle(el).fontFamily;
    test.style.fontSize = getComputedStyle(el).fontSize;
    test.textContent = "#";
    document.body.appendChild(test);

    const charWidth = test.getBoundingClientRect().width;
    document.body.removeChild(test);

    const width = el.getBoundingClientRect().width;
    const count = Math.floor(width / charWidth) - 1;

    el.textContent = "#".repeat(Math.max(count, 0));
  });
}

let spyObserver = null;

/**
 * Highlight the pane nav link for whichever section is currently in view.
 * Uses an IntersectionObserver tuned to a band across the middle of the
 * viewport so the active link tracks reading position.
 */
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll(".pane__nav a[data-spy]"));
  if (!links.length) return;

  if (spyObserver) spyObserver.disconnect();

  const byId = {};
  links.forEach((l) => (byId[l.dataset.spy] = l));
  const sections = links
    .map((l) => document.getElementById(l.dataset.spy))
    .filter(Boolean);

  spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove("is-active"));
          byId[e.target.id]?.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
  );

  sections.forEach((s) => spyObserver.observe(s));
}

function initPage() {
  updateHashDividers();
  initScrollSpy();
}

window.addEventListener("load", initPage);
window.addEventListener("resize", updateHashDividers);
// Re-run after Astro view-transition navigations (initial + subsequent).
document.addEventListener("astro:page-load", initPage);
