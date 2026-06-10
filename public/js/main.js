// Highlight the pane nav link for whichever section is in view.
// Tuned to a band across the middle of the viewport so the active link
// tracks reading position. Re-runs on Astro view-transition navigations.

let spyObserver = null;

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

window.addEventListener("load", initScrollSpy);
document.addEventListener("astro:page-load", initScrollSpy);
