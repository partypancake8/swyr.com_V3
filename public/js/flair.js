// Motion + hover flair. Every effect is skipped while <html data-motion="off">
// (the CSS hides nothing in that case either, so content is always visible).
// Motion is on by default; the footer toggle flips the attribute at runtime.
(function () {
  // Media fades in once it has loaded (CSS keys off [data-loaded]; harmless without motion).
  document.querySelectorAll('img, video').forEach(function (m) {
    var done = function () { m.setAttribute('data-loaded', ''); };
    if (m.tagName === 'VIDEO') {
      if (m.readyState >= 2) done(); else m.addEventListener('loadeddata', done, { once: true });
    } else if (m.complete && m.naturalWidth) done();
    else { m.addEventListener('load', done, { once: true }); m.addEventListener('error', done, { once: true }); }
  });

  var root = document.documentElement;
  function motionOn() { return root.getAttribute('data-motion') !== 'off'; }
  var started = false;
  function onMotion() {
    if (motionOn()) { if (!started) { started = true; startMotion(); } else if (window.__swyrFlairScroll) window.__swyrFlairScroll(); }
    else {
      // Stop: the bar and parallax return to rest; CSS drops every motion rule.
      var b = document.querySelector('.site-header__progress'), p = document.querySelector('.hero__tilt'), t = document.querySelector('[data-tilt]');
      if (b) b.style.transform = '';
      if (p) p.style.removeProperty('--py');
      if (t) { t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); }
    }
  }
  new MutationObserver(onMotion).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  onMotion();

  function startMotion() {
  var raf = window.requestAnimationFrame;

  // 1. Scroll reveal: once, staggered 60 ms per item in each batch.
  var targets = document.querySelectorAll('.section-block, .contrib, .work-card, .tl-item, .photo-strip li, .contact-links a, .proj-gallery__item, .proj-stage__item, .proj-comp-card, .proj-specs, .proj-widget-list, .proj-cta, .repo-head, .readme-panel, .resume-head, .resume-page');
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.style.setProperty('--stagger', (n++ * 60) + 'ms');
      el.classList.add('in');
      if (el.matches('.contrib')) { el.classList.add('is-drawn'); countUp(el.querySelector('[data-count]')); }
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (el) {
    // The hero contact row is part of the load sequence (CSS delays it), not the scroll reveal.
    if (el.closest('.hero')) el.classList.add('in'); else io.observe(el);
  });

  // Contribution total counts up from 0 once the panel reveals; width is pinned first
  // (tabular digits, right aligned) so the rest of the title never moves.
  function countUp(c) {
    if (!c) return;
    var to = +c.getAttribute('data-count') || 0;
    var dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-count')) || 900;
    var t0 = 0;
    c.style.minWidth = c.getBoundingClientRect().width + 'px';
    c.textContent = '0';
    raf(function step(now) {
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      c.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
      if (p < 1) raf(step);
    });
  }

  // Scroll progress bar + hero photo parallax (up to 24px), one rAF per frame.
  var bar = document.querySelector('.site-header__progress');
  var par = document.querySelector('.hero__tilt');
  var sq = false;
  function onScroll() {
    sq = false;
    if (!motionOn()) return;
    var de = document.documentElement, y = window.scrollY, max = de.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (par) par.style.setProperty('--py', (-Math.min(24, y * 0.1)).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', function () { if (!sq) { sq = true; raf(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  window.__swyrFlairScroll = onScroll;

  // 2. Spotlight border + hover lift: pointer position into --mx / --my, rAF throttled.
  var spot = null, sx = 0, sy = 0, queued = false;
  document.addEventListener('pointermove', function (e) {
    if (!motionOn()) return;
    spot = e.target.closest && e.target.closest('.work-card, .contact-links a');
    if (!spot) return;
    sx = e.clientX; sy = e.clientY;
    if (!queued) {
      queued = true;
      raf(function () {
        queued = false;
        if (!spot) return;
        var r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', (sx - r.left) + 'px');
        spot.style.setProperty('--my', (sy - r.top) + 'px');
      });
    }
  }, { passive: true });

  // 3. Hero photo tilt toward the pointer (max 6deg), reset on leave.
  var tilt = document.querySelector('[data-tilt]');
  if (tilt && window.matchMedia('(hover: hover)').matches) {
    var tx = 0, ty = 0, tq = false;
    tilt.addEventListener('pointermove', function (e) {
      if (!motionOn()) return;
      tx = e.clientX; ty = e.clientY;
      if (tq) return;
      tq = true;
      raf(function () {
        tq = false;
        var r = tilt.getBoundingClientRect();
        var px = (tx - r.left) / r.width - 0.5, py = (ty - r.top) / r.height - 0.5;
        tilt.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
      });
    });
    tilt.addEventListener('pointerleave', function () {
      tilt.style.setProperty('--rx', '0deg');
      tilt.style.setProperty('--ry', '0deg');
    });
  }

  // 4. Contribution graph tooltip (GitHub style), one shared element.
  var graph = document.querySelector('[data-contrib]');
  if (graph) {
    var tip = graph.querySelector('.contrib__tip');
    graph.addEventListener('pointerover', function (e) {
      var c = e.target;
      if (!c.dataset || !c.dataset.tip) { tip.classList.remove('is-visible'); return; }
      tip.textContent = c.dataset.tip;
      var g = graph.getBoundingClientRect(), r = c.getBoundingClientRect();
      tip.style.setProperty('--tx', (r.left - g.left + r.width / 2) + 'px');
      tip.style.setProperty('--ty', (r.top - g.top - 8) + 'px');
      tip.classList.add('is-visible');
    });
    graph.addEventListener('pointerleave', function () { tip.classList.remove('is-visible'); });
  }

  // Experience timeline: the active entry's own marker fills in (CSS fades it); no
  // travelling element. Active = the entry crossing a band at 35-45% of the viewport,
  // held for 80 ms (debounced so it never flickers); at the bottom of the page the last entry wins.
  var tlItems = [].slice.call(document.querySelectorAll('.timeline .tl-item'));
  if (tlItems.length) {
    var inBand = [], active = -1, pending = -1, holdTimer = 0;
    function mark() {
      tlItems.forEach(function (it, i) { it.classList.toggle('is-active', i === active); });
    }
    function choose() {
      var next = -1;
      for (var i = 0; i < tlItems.length; i++) if (inBand[i]) { next = i; break; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) next = tlItems.length - 1;
      if (next < 0 || next === active || next === pending) return;
      pending = next;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { active = pending; pending = -1; mark(); }, 80);
    }
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inBand[tlItems.indexOf(en.target)] = en.isIntersecting; });
      choose();
    }, { rootMargin: '-35% 0px -55% 0px' });
    tlItems.forEach(function (it) { bio.observe(it); });
    window.addEventListener('scroll', function () { if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) choose(); }, { passive: true });
  }
  }
})();
