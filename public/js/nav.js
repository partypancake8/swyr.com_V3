// Site header: scrolled state, live breadcrumb (one IntersectionObserver is the
// single source of truth for the current section), and JS-driven smooth
// scrolling for in-page anchors so Safari and Chrome behave the same.
(function () {
  var header = document.querySelector('[data-site-header]');
  if (!header || header.dataset.navReady) return;
  header.dataset.navReady = '1';

  // Motion follows <html data-motion> (on by default), not the OS setting.
  var reduce = { get matches() { return document.documentElement.getAttribute('data-motion') === 'off'; } };

  /* ---------- motion toggle (footer) ---------- */
  var mt = document.getElementById('motion-toggle');
  function syncToggle() {
    if (!mt) return;
    var on = !reduce.matches;
    mt.setAttribute('aria-pressed', String(on));
    mt.textContent = 'Motion: ' + (on ? 'on' : 'off');
  }
  if (mt) {
    syncToggle();
    mt.addEventListener('click', function () {
      var next = reduce.matches ? 'on' : 'off';
      document.documentElement.setAttribute('data-motion', next);
      try { if (next === 'off') localStorage.setItem('swyr-motion', 'off'); else localStorage.removeItem('swyr-motion'); } catch (e) {}
      syncToggle();
    });
  }
  /* ---------- smooth scroll (JS, eased, same in every browser) ---------- */
  var scrollAnim = 0;
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function targetY(el) {
    if (!el) return 0;
    var m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY - m,
      document.documentElement.scrollHeight - window.innerHeight));
  }
  function smoothScroll(y) {
    cancelAnimationFrame(scrollAnim);
    var from = window.scrollY, dist = y - from, t0 = 0, dur = 600;
    if (reduce.matches || Math.abs(dist) < 2) { window.scrollTo({ top: y, behavior: 'instant' }); return; }
    function step(now) {
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: from + dist * ease(p), behavior: 'instant' });
      if (p < 1) scrollAnim = requestAnimationFrame(step);
    }
    scrollAnim = requestAnimationFrame(step);
  }
  // Any user wheel / touch cancels a running animation.
  var userScrolled = false;
  ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
    window.addEventListener(t, function () { userScrolled = true; cancelAnimationFrame(scrollAnim); }, { passive: true });
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.hasAttribute('data-scroll-top') && a.pathname === location.pathname) {
      e.preventDefault();
      smoothScroll(0);
      history.pushState(null, '', location.pathname + location.search);
      return;
    }
    var href = a.getAttribute('href');
    if (href.indexOf('#') === -1 || a.pathname !== location.pathname || a.origin !== location.origin) return;
    var id = decodeURIComponent(a.hash.slice(1));
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    smoothScroll(targetY(el));
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  });

  // Arriving on /#section from another page: land instantly, then fade the heading in.
  if (location.hash) {
    var arrive = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (arrive) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo({ top: targetY(arrive), behavior: 'instant' });
      requestAnimationFrame(function () { window.scrollTo({ top: targetY(arrive), behavior: 'instant' }); });
      arrive.classList.add('is-arrived');
      // Late-loading media above the target can shift it; re-pin once everything loaded.
      window.addEventListener('load', function () {
        if (!userScrolled) window.scrollTo({ top: targetY(arrive), behavior: 'instant' });
      }, { once: true });
    }
  }

  /* ---------- scrolled state ---------- */
  var ticking = false;
  function onScroll() {
    ticking = false;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    pickActive();
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------- live breadcrumb ---------- */
  var live = header.querySelector('[data-crumb-live]');
  var sections = [].slice.call(document.querySelectorAll('main [data-crumb][id]'));
  var inBand = {};
  var current;

  function crumbHTML(label) {
    return '<span class="breadcrumb__sep" aria-hidden="true">/</span><span class="breadcrumb__current">' + label + '</span>';
  }
  var crumbTimer = 0;
  function setCrumb(el) {
    if (!live) return;
    var label = el ? el.getAttribute('data-crumb') : '';
    var crumbsLinks = header.querySelectorAll('.breadcrumb__crumb');
    crumbsLinks.forEach(function (c) { c.removeAttribute('aria-current'); });
    if (!label) crumbsLinks[crumbsLinks.length - 1].setAttribute('aria-current', 'page');
    clearTimeout(crumbTimer);
    if (reduce.matches) {
      live.innerHTML = label ? crumbHTML(label) : '';
      live.classList.toggle('is-empty', !label);
      return;
    }
    // Crossfade: old crumb fades and rises out, new one fades and rises in (~180 ms).
    live.classList.add('is-leaving');
    crumbTimer = setTimeout(function () {
      live.innerHTML = label ? crumbHTML(label) : '';
      live.classList.toggle('is-empty', !label);
      live.classList.remove('is-leaving');
      live.classList.add('is-entering');
      live.offsetWidth; // commit the start state before transitioning
      live.classList.remove('is-entering');
    }, live.textContent ? 90 : 0);
  }

  function pickActive() {
    if (!sections.length) return;
    // The section currently under the header wins; otherwise the first one
    // the observer reports inside the upper band of the viewport.
    var next = null;
    var bandTop = header.getBoundingClientRect().height + 16;
    for (var j = 0; j < sections.length; j++) {
      var r = sections[j].getBoundingClientRect();
      if (r.top <= bandTop + 1 && r.bottom > bandTop + 1) next = sections[j];
    }
    if (!next) {
      for (var i = 0; i < sections.length; i++) {
        if (inBand[sections[i].id]) { next = sections[i]; break; }
      }
    }
    // At the very bottom the last sections never reach the band; prefer the
    // section named in the hash if it is on screen, else the last one visible.
    if (window.scrollY > 8 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      var seen = sections.filter(function (s) { return s.getBoundingClientRect().top < window.innerHeight; });
      var h = decodeURIComponent(location.hash.slice(1));
      next = seen.filter(function (s) { return s.id === h; })[0] || seen[seen.length - 1] || next;
    }
    if (window.scrollY <= 8) next = null; // very top of the page: just the path
    var id = next ? next.id : null;
    if (id === current) return;
    current = id;
    setCrumb(next);
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inBand[en.target.id] = en.isIntersecting; });
      pickActive();
    }, { rootMargin: '-80px 0px -55% 0px' });
    sections.forEach(function (s) { io.observe(s); });
    window.addEventListener('popstate', pickActive);
  }
  if (live) live.classList.add('is-empty');
  onScroll();
})();
