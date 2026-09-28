// Motion + hover flair. Every effect is skipped under prefers-reduced-motion
// (the CSS hides nothing in that case either, so content is always visible).
(function () {
  // Media fades in once it has loaded (CSS keys off [data-loaded]; harmless without motion).
  document.querySelectorAll('img, video').forEach(function (m) {
    var done = function () { m.setAttribute('data-loaded', ''); };
    if (m.tagName === 'VIDEO') {
      if (m.readyState >= 2) done(); else m.addEventListener('loadeddata', done, { once: true });
    } else if (m.complete && m.naturalWidth) done();
    else { m.addEventListener('load', done, { once: true }); m.addEventListener('error', done, { once: true }); }
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var raf = window.requestAnimationFrame;

  // 1. Scroll reveal: once, staggered 60 ms per item in each batch.
  var targets = document.querySelectorAll('.section-block, .contrib, .work-card, .tl-item, .photo-strip li, .contact-links a, .proj-gallery__item, .proj-stage__tile, .proj-comp-card, .proj-specs, .proj-widget-list, .proj-cta');
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.style.setProperty('--stagger', (n++ * 60) + 'ms');
      el.classList.add('in');
      if (el.matches('.contrib')) el.classList.add('is-drawn');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (el) { io.observe(el); });

  // 2. Spotlight border + hover lift: pointer position into --mx / --my, rAF throttled.
  var spot = null, sx = 0, sy = 0, queued = false;
  document.addEventListener('pointermove', function (e) {
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

  // Experience timeline: the entry in the middle band of the viewport is current.
  var items = [].slice.call(document.querySelectorAll('.tl-item'));
  if (items.length) {
    var seen = {};
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[items.indexOf(en.target)] = en.isIntersecting; });
      var cur = -1;
      items.forEach(function (_, i) { if (seen[i]) cur = i; });
      if (cur < 0) return;
      items.forEach(function (it, i) { it.classList.toggle('is-current', i === cur); });
    }, { rootMargin: '-30% 0px -45% 0px' });
    items.forEach(function (it) { tio.observe(it); });
  }
})();
