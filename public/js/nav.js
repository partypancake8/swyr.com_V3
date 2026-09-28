// Site header behaviour: mobile menu toggle + active section highlighting.
// Loaded once per page (plain multi-page site, no client router).
(function () {
  var header = document.querySelector('[data-site-header]');
  if (!header || header.dataset.navReady) return;
  header.dataset.navReady = '1';

  var toggle = header.querySelector('[data-nav-toggle]');
  var panel = header.querySelector('[data-nav-panel]');

  function setOpen(open, focusToggle) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open && focusToggle) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) {
      var first = panel.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  });

  // Close on any link click inside the panel (same-page anchors included).
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) setOpen(false, true);
  });

  document.addEventListener('click', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
  });

  // Leaving the mobile breakpoint always resets the menu.
  var mq = window.matchMedia('(min-width: 768px)');
  var onMq = function () { if (mq.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);

  // Header gains its border + blur backdrop once the page has scrolled 8px.
  var ticking = false;
  function onScroll() {
    ticking = false;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (sections.length) pickActive();
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  // Active section (landing page): IntersectionObserver tracks which sections
  // cross a band just under the header; the first one in document order wins.
  var links = [].slice.call(header.querySelectorAll('[data-section-link]'));
  var indicator = header.querySelector('.site-nav__indicator');
  var sections = links.map(function (a) { return document.getElementById(a.dataset.sectionLink); }).filter(Boolean);
  var inBand = {};
  var current = null;

  function moveIndicator() {
    var a = current && header.querySelector('[data-section-link="' + current + '"]');
    if (!indicator) return;
    if (!a || !a.offsetWidth) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.transform = 'translateX(' + a.offsetLeft + 'px) scaleX(' + a.offsetWidth + ')';
  }

  function pickActive() {
    var next = null;
    for (var i = 0; i < sections.length; i++) {
      if (inBand[sections[i].id]) { next = sections[i].id; break; }
    }
    // At the very bottom the last sections never reach the band; prefer the
    // section named in the hash if it is on screen, else the last one visible.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      var seen = sections.filter(function (s) { return s.getBoundingClientRect().top < window.innerHeight; });
      var h = location.hash.slice(1);
      next = seen.some(function (s) { return s.id === h; }) ? h : (seen.length ? seen[seen.length - 1].id : next);
    }
    if (next === current) return;
    current = next;
    links.forEach(function (a) {
      var on = a.dataset.sectionLink === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    moveIndicator();
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inBand[en.target.id] = en.isIntersecting; });
      pickActive();
    }, { rootMargin: '-80px 0px -55% 0px' });
    sections.forEach(function (s) { io.observe(s); });
    window.addEventListener('hashchange', pickActive);
    window.addEventListener('resize', moveIndicator);
  }
  onScroll();
})();
