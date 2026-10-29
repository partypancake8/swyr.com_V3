// Live GitHub star counts for the work cards. The build-time number from
// repos.json is the rendered fallback; this replaces it with the current count.
// Unauthenticated API (60 requests/hour/IP), so each result is cached in
// sessionStorage for 10 minutes. Any failure leaves the fallback untouched.
(function () {
  var TTL = 10 * 60 * 1000;
  var KEY = 'swyr-stars:';

  function readCache(repo) {
    try {
      var raw = sessionStorage.getItem(KEY + repo);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (typeof c.n === 'number' && Date.now() - c.t < TTL) return c.n;
    } catch (e) {}
    return null;
  }
  function writeCache(repo, n) {
    try { sessionStorage.setItem(KEY + repo, JSON.stringify({ n: n, t: Date.now() })); } catch (e) {}
  }

  function show(card, repo, n) {
    var span = card.querySelector('[data-stars]');
    if (!span) return;
    var old = parseInt(span.textContent, 10);
    if (old === n) return;
    var label = card.querySelector('.work-card__stars');
    var swap = function () {
      span.textContent = String(n);
      if (label) label.setAttribute('aria-label', n + ' stars');
      span.classList.remove('is-swapping');
    };
    console.log('[stars] ' + repo + ' ' + old + ' -> ' + n);
    if (document.documentElement.getAttribute('data-motion') === 'on') {
      span.classList.add('is-swapping');
      setTimeout(swap, 160);
    } else {
      swap();
    }
  }

  function run() {
    var cards = document.querySelectorAll('[data-repo]');
    Array.prototype.forEach.call(cards, function (card) {
      var repo = card.getAttribute('data-repo');
      if (!repo) return;
      var cached = readCache(repo);
      if (cached !== null) { show(card, repo, cached); return; }
      if (!window.fetch) return;
      fetch('https://api.github.com/repos/partypancake8/' + encodeURIComponent(repo), {
        headers: { Accept: 'application/vnd.github+json' }
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || typeof d.stargazers_count !== 'number') return;
          writeCache(repo, d.stargazers_count);
          show(card, repo, d.stargazers_count);
        })
        .catch(function () {});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
