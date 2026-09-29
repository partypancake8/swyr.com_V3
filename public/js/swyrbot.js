// swyrbot: the hero invader, animated on a <canvas>. Frames are ported from the
// Swyrbot Lab: a base matrix plus clips, each frame a list of ops on named parts.
// No eyes, ever: the S (negative space in the body) is the face.
(function () {
  var cv = document.querySelector('.hero__bot');
  var svg = document.querySelector('.hero__logo');
  var ctx = cv && cv.getContext && cv.getContext('2d');
  if (!ctx) return; // no canvas: the static SVG stays

  // base pose, 42x40, run-length rows: alternating empty/filled counts, starting empty
  var BASE = '8.4.18.4.8/8.4.18.4.8/8.4.18.4.8/8.4.18.4.8/12.4.10.4.12/12.4.10.4.12/12.4.10.4.12/12.4.10.4.12/8.26.8/8.26.8/8.26.8/8.26.8/4.11.12.11.4/4.11.12.11.4/4.9.16.9.4/4.9.4.8.4.9.4/0.13.4.8.4.13/0.13.4.25/0.13.4.25/0.13.14.15/0.15.12.15/0.15.14.13/0.25.4.13/0.25.4.13/0.4.4.5.4.8.4.5.4.4/0.4.4.5.4.8.4.5.4.4/0.4.4.5.16.5.4.4/0.4.4.7.12.7.4.4/0.4.4.7.12.7.4.4/0.4.4.26.4.4/0.4.4.26.4.4/0.4.4.26.4.4/12.4.10.4.12/12.4.10.4.12/12.4.10.4.12/12.4.10.4.12/8.4.18.4.8/8.4.18.4.8/8.4.18.4.8/8.4.18.4.8'.split('/').map(function (row) {
    var s = '', f = 0;
    row.split('.').forEach(function (n) { s += (f ? '#' : '.').repeat(+n); f = !f; });
    return s;
  });
  // Stage: base cols -2..43 (room for the wave and the dance shear), rows 0..39.
  var BW = 42, BH = 40, OR = 0, OC = 2, W = 46, H = 40, SHADOW = 6;
  function inS(r, c) { return r >= 12 && r <= 28 && c >= 13 && c <= 28; }

  // named parts, as masks over base coordinates
  var PART = {
    armL: function (r, c) { return r >= 16 && r <= 31 && c <= 3; },
    armR: function (r, c) { return r >= 16 && r <= 31 && c >= 38; },
    armTopR: function (r, c) { return r <= 11 && c >= 35; },
    upper: function (r, c) { return r <= 31; }
  };
  function mv(part, dy, dx) { return ['move', part, dy, dx]; }
  var BREATH = mv('upper', 1, 0), PULSE = ['pulse'];

  function put(g, r, c, v) { if (r >= 0 && r < H && c >= 0 && c < W) g[r * W + c] = v; }
  // cell values: 0 empty, 1 body, 3 body inside the S zone, 2 pulse highlight
  var OPS = {
    move: function (g, part, dy, dx) {
      var m = PART[part], cells = [], r, c, v;
      for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
        v = g[r * W + c];
        if (v && m(r - OR, c - OC)) { cells.push([r, c, v]); g[r * W + c] = 0; }
      }
      cells.forEach(function (x) { put(g, x[0] + dy, x[1] + dx, x[2]); });
      return g;
    },
    shift: function (g, dy, dx) {
      var o = new Uint8Array(W * H);
      for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (g[r * W + c]) put(o, r + dy, c + dx, g[r * W + c]);
      return o;
    },
    shear: function (g, r0, r1, dx) { // shift base rows r0..r1 sideways
      var o = g.slice();
      for (var r = Math.max(0, r0 + OR); r <= Math.min(H - 1, r1 + OR); r++) {
        for (var c = 0; c < W; c++) o[r * W + c] = 0;
        for (c = 0; c < W; c++) if (g[r * W + c]) put(o, r, c + dx, g[r * W + c]);
      }
      return o;
    },
    pulse: function (g) { return g.map(function (v) { return v === 3 ? 2 : v; }); }
  };

  var BASE_GRID = new Uint8Array(W * H);
  for (var r = 0; r < BH; r++) for (var c = 0; c < BW; c++)
    if (BASE[r][c] === '#') BASE_GRID[(r + OR) * W + c + OC] = inS(r, c) ? 3 : 1;

  function resolve(f) {
    var g = BASE_GRID.slice();
    (f.ops || []).forEach(function (op) { g = OPS[op[0]].apply(null, [g].concat(op.slice(1))) || g; });
    return g;
  }
  var up = function (n) { return mv('armR', -n, 0); };
  var CLIPS = {
    // breathes down one row and back; the S pulses once every 3 s
    idle: { fps: 4, frames: [{}, {}, {}, { ops: [PULSE] }, {}, {}, { ops: [BREATH] }, { ops: [BREATH] }, { ops: [BREATH] }, { ops: [BREATH] }, { ops: [BREATH] }, { ops: [BREATH] }] },
    // right arm rises over 3 frames, waves, then lowers
    wave: { fps: 8, frames: [{}, { ops: [up(4)] }, { ops: [up(8)] }, { ops: [up(12)] },
      { ops: [up(12), mv('armTopR', 0, 2)] }, { ops: [up(12), mv('armTopR', 0, -2)] },
      { ops: [up(12), mv('armTopR', 0, 2)] }, { ops: [up(12), mv('armTopR', 0, -2)] },
      { ops: [up(8)] }, { ops: [up(4)] }] },
    // top rows shear left then right while the arms alternate (two bars)
    dance: { fps: 6, frames: [] }
  };
  var D = [{ ops: [mv('armL', -4, 0), mv('armR', 4, 0), ['shear', -8, 11, -2], ['shear', 12, 19, -1]] }, {},
    { ops: [mv('armR', -4, 0), mv('armL', 4, 0), ['shear', -8, 11, 2], ['shear', 12, 19, 1]] }, {}];
  CLIPS.dance.frames = D.concat(D);
  Object.keys(CLIPS).forEach(function (k) { CLIPS[k].grids = CLIPS[k].frames.map(resolve); });

  var cs = getComputedStyle(document.documentElement);
  var PAL = { 1: cs.getPropertyValue('--accent').trim() || '#3fb950', 3: cs.getPropertyValue('--accent-strong').trim() || '#56d364', 2: '#aff5b4' };

  var cell = 0, dpr = 1;
  function size() {
    var n = parseInt(getComputedStyle(cv).getPropertyValue('--cell'), 10) || 5;
    var d = Math.max(1, Math.round(window.devicePixelRatio || 1));
    if (n === cell && d === dpr) return;
    cell = n; dpr = d;
    cv.style.width = (W * cell + SHADOW) + 'px';
    cv.style.height = (H * cell + SHADOW) + 'px';
    cv.width = (W * cell + SHADOW) * dpr;
    cv.height = (H * cell + SHADOW) * dpr;
    ctx.imageSmoothingEnabled = false;
  }
  var shown = null;
  function draw(g) {
    shown = g;
    var s = cell * dpr, o = SHADOW * dpr, r, c, v;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#0f3d1a'; // hard offset shadow, zero blur
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (g[r * W + c]) ctx.fillRect(c * s + o, r * s + o, s, s);
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      v = g[r * W + c];
      if (v) { ctx.fillStyle = PAL[v]; ctx.fillRect(c * s, r * s, s, s); }
    }
  }

  size();
  cv.hidden = false;
  if (svg) svg.setAttribute('hidden', ''); // SVGElement has no .hidden property
  window.addEventListener('resize', function () { size(); if (shown) draw(shown); });

  // Motion follows <html data-motion> (on by default); the footer toggle flips it live.
  var root = document.documentElement, running = false;
  function motionOn() { return root.getAttribute('data-motion') !== 'off'; }

  // player: one clip at a time; one-shots return to idle, the next request queues
  var cur = 'idle', fi = 0, i = 0, t0 = 0, queue = null, last = 'dance';
  function play(name) {
    if (!CLIPS[name] || name === 'idle' || !motionOn()) return;
    if (cur !== 'idle') { queue = name; return; }
    cur = name; i = 0; t0 = 0; last = name;
  }
  function tick(t) {
    var clip = CLIPS[cur];
    if (!t0) t0 = t;
    var n = Math.floor((t - t0) * clip.fps / 1000);
    if (cur !== 'idle' && n >= clip.grids.length) {
      cur = 'idle'; t0 = t; n = 0;
      if (queue) { var q = queue; queue = null; play(q); }
      clip = CLIPS[cur];
    }
    n = cur === 'idle' ? n % clip.grids.length : n;
    fi = n;
    if (clip.grids[n] !== shown) draw(clip.grids[n]);
    requestAnimationFrame(tickGate);
  }
  function tickGate(t) { if (!motionOn()) { running = false; draw(BASE_GRID); return; } tick(t); }
  function run() {
    if (running) return;
    running = true; cur = 'idle'; queue = null; t0 = 0;
    draw(CLIPS.idle.grids[0]);
    requestAnimationFrame(tickGate);
  }
  new MutationObserver(function () { if (motionOn()) run(); }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (motionOn()) run(); else draw(BASE_GRID);

  function next() { play(last === 'wave' ? 'dance' : 'wave'); }
  cv.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') next(); });
  cv.addEventListener('click', next);

  // 1.5 s after the hero entrance finishes: wave once, then every 12 s alternate
  var tilt = document.querySelector('.hero__tilt'), started = false;
  function start() {
    if (started) return;
    started = true;
    setTimeout(function () { play('wave'); setInterval(next, 12000); }, 1500);
  }
  if (tilt) tilt.addEventListener('animationend', function (e) { if (e.target === tilt) start(); });
  var a = tilt && getComputedStyle(tilt);
  var dur = a ? (parseFloat(a.animationDelay) + parseFloat(a.animationDuration)) * 1000 : 0;
  setTimeout(start, (dur || 0) + 50);

  window.swyrbot = { play: play, clips: Object.keys(CLIPS), now: function () { return cur + ':' + fi; } };
})();
