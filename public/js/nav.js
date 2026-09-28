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

  // Active section highlighting (landing page only).
  var links = header.querySelectorAll('[data-section-link]');
  var sections = [];
  links.forEach(function (a) {
    var s = document.getElementById(a.dataset.sectionLink);
    if (s) sections.push(s);
  });
  if (!sections.length) return;
  var ticking = false;
  function update() {
    ticking = false;
    var offset = header.getBoundingClientRect().height + 24;
    var current = null;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= offset) current = s.id;
    });
    // At the bottom of the page the last sections can never reach the top;
    // prefer the one named in the URL hash, else the last one.
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) {
      var hashId = location.hash.slice(1);
      var inView = sections.filter(function (s) { return s.getBoundingClientRect().top < window.innerHeight; });
      var byHash = inView.filter(function (s) { return s.id === hashId; })[0];
      if (byHash) current = byHash.id;
      else if (inView.length) current = inView[inView.length - 1].id;
    }
    links.forEach(function (a) {
      var on = a.dataset.sectionLink === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  function schedule() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  update();
})();
