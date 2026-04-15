/**
 * Text Globe
 * Renders a 3D sphere whose surface is made of individual unicode characters.
 * Each character lives AT a point on the sphere — no rain, no trails.
 * Depth controls font size and opacity, giving a clear spherical 3D look.
 *
 * Technique:
 *   - Fibonacci sphere distributes ~450 points evenly on a unit sphere
 *   - Each frame: clear canvas, rotate Y, project points to 2D
 *   - Front (z≈+1): large, bright char | Back (z≈-1): small, dim char
 *   - Characters occasionally mutate to keep it feeling alive
 */

(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────────

  const POINT_COUNT = 15000;
  const ROT_SPEED = 0.002; // rad/frame  ≈ 16 s/revolution at 60 fps
  const MUTATE_PROB = 0.00001; // probability a land point char flickers per frame
  const MOBILE_BREAKPOINT = 770;
  const LAND_DATA_URL = "public/data/land.geojson";
  const FADE_SCROLL_VH = 1.5; // viewport-heights of scroll over which globe fades out (1.0 = fully gone after scrolling 100vh)

  // Character pool: hex digits — uniform width, digital aesthetic, all meaningful
  const CHAR_POOL = "0123456789ABCDEF";

  // Depth-to-style mapping
  const FONT_MIN = 4;
  const FONT_MAX_FACTOR = 0.03;
  const ALPHA_LAND_FRONT = 1.0;
  const ALPHA_LAND_BACK = 0.15;
  const ALPHA_OCEAN_MAX = 0.005; // ocean dot max opacity — keep low for sharp coastline edges

  // ── State ─────────────────────────────────────────────────────────────────────

  const canvas = document.getElementById("globe-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let rotY = 0;
  let cx, cy, R;
  let points = [];
  let rafId = null;
  let paused = false;
  let landFeatures = null; // GeoJSON Feature array, populated after fetch
  let userPoint = null; // { phi, theta } — set after IP geolocation resolves

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function remap(v, i0, i1, o0, o1) {
    return o0 + ((v - i0) / (i1 - i0)) * (o1 - o0);
  }

  function randChar() {
    return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
  }

  // ── IP geolocation marker ────────────────────────────────────────────────────

  /**
   * Fetch the visitor's public IP location (lat/lon) via ipapi.co.
   * On success, store a sphere point so the marker rotates with the globe.
   * The initial rotY at fetch time is baked in so the marker starts at the
   * correct longitude and stays locked as the globe spins.
   */
  function loadUserLocation() {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (
          typeof data.latitude !== "number" ||
          typeof data.longitude !== "number"
        )
          return;
        // Store raw geographic longitude in radians — same coordinate system
        // the Fibonacci sphere uses. toXYZ(phi, theta, rotY) adds rotY each
        // frame, so the point rotates with the globe automatically.
        const phi = data.latitude * (Math.PI / 180);
        const theta = data.longitude * (Math.PI / 180);
        userPoint = { phi, theta };
      })
      .catch(() => {
        /* geolocation unavailable — no marker shown */
      });
  }

  // ── Land classification (GeoJSON point-in-polygon) ────────────────────────────

  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0],
        yi = ring[i][1];
      const xj = ring[j][0],
        yj = ring[j][1];
      if (
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  function checkPolygon(lon, lat, rings) {
    if (!pointInRing(lon, lat, rings[0])) return false;
    for (let h = 1; h < rings.length; h++) {
      if (pointInRing(lon, lat, rings[h])) return false; // inside a hole
    }
    return true;
  }

  function isLandCoord(lonDeg, latDeg) {
    for (const feat of landFeatures) {
      const geom = feat.geometry;
      if (geom.type === "Polygon") {
        if (checkPolygon(lonDeg, latDeg, geom.coordinates)) return true;
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          if (checkPolygon(lonDeg, latDeg, poly)) return true;
        }
      }
    }
    return false;
  }

  /** Convert sphere coords to lon/lat degrees and classify against land polygons. */
  function classifyPoint(phi, theta) {
    const latDeg = phi * (180 / Math.PI);
    const lonRaw = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const lonDeg =
      lonRaw > Math.PI
        ? (lonRaw - 2 * Math.PI) * (180 / Math.PI)
        : lonRaw * (180 / Math.PI);
    return isLandCoord(lonDeg, latDeg);
  }

  /** Fetch GeoJSON then classify all sphere points (runs once at startup). */
  function loadLandData() {
    fetch(LAND_DATA_URL)
      .then((r) => r.json())
      .then((geojson) => {
        landFeatures = geojson.features;
        for (const p of points) {
          p.land = classifyPoint(p.phi, p.theta);
        }
      })
      .catch(() => {
        /* silent fallback: all points stay land=true */
      });
  }

  // ── Sphere geometry ───────────────────────────────────────────────────────────

  function fibonacciSphere(n) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const out = [];
    for (let i = 0; i < n; i++) {
      const sinLat = 1 - (i / (n - 1)) * 2;
      const theta = golden * i;
      out.push({ phi: Math.asin(sinLat), theta });
    }
    return out;
  }

  function toXYZ(phi, theta, rot) {
    const t = theta + rot;
    return {
      x: Math.cos(phi) * Math.cos(t),
      y: Math.sin(phi),
      z: Math.cos(phi) * Math.sin(t),
    };
  }

  function project(x, y, z) {
    const fov = 2.5;
    const s = (R * fov) / (fov + z);
    return { sx: cx - x * s, sy: cy - y * s }; // negate x: outside-sphere view, east = right
  }

  // ── Layout ────────────────────────────────────────────────────────────────────

  function setLayout() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    R = Math.min(canvas.width, canvas.height) * (mobile ? 0.3 : 0.36);
    cx = canvas.width * (mobile ? 0.5 : 0.67);
    cy = canvas.height * 0.48;
  }

  // ── Init points ───────────────────────────────────────────────────────────────

  function initPoints() {
    points = fibonacciSphere(POINT_COUNT).map(({ phi, theta }) => ({
      phi,
      theta,
      char: randChar(),
      land: true, // default: show all as land until GeoJSON loads
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    rotY += ROT_SPEED;

    // Build projected list
    const projected = points.map((p) => {
      if (p.land && Math.random() < MUTATE_PROB) p.char = randChar();
      const { x, y, z } = toXYZ(p.phi, p.theta, rotY);
      const { sx, sy } = project(x, y, z);
      return { sx, sy, z, char: p.char, land: p.land };
    });

    // Painter's algorithm: back-to-front so front chars overlap back chars
    projected.sort((a, b) => a.z - b.z);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const { sx, sy, z, char, land } of projected) {
      const alpha = remap(
        z,
        -1,
        1,
        land ? ALPHA_LAND_BACK : 0,
        land ? ALPHA_LAND_FRONT : ALPHA_OCEAN_MAX,
      );
      if (land) {
        const fontSize = Math.round(
          remap(z, -1, 1, FONT_MIN, R * FONT_MAX_FACTOR),
        );
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = `rgba(0,255,80,${alpha.toFixed(3)})`;
        ctx.fillText(char, sx, sy);
      } else {
        // Ocean: tiny faint dot to preserve sphere silhouette
        const dotR = Math.max(0.8, remap(z, -1, 1, 0.8, 2.2));
        ctx.fillStyle = `rgba(0,200,80,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── User IP marker (always drawn on top) ───────────────────────────────────
    if (userPoint) {
      const { x, y, z } = toXYZ(userPoint.phi, userPoint.theta, rotY);
      const { sx, sy } = project(x, y, z);

      if (z > -0.1) {
        const depthAlpha = remap(z, -0.1, 1, 0.3, 1.0);
        const fontSize   = Math.round(remap(z, -0.1, 1, FONT_MIN + 2, R * FONT_MAX_FACTOR * 1.8));
        const step       = fontSize * 0.95; // spacing between cluster chars

        // Small cross-shaped cluster: centre + 4 cardinal neighbours
        const offsets = [
          [0, 0], [-step, 0], [step, 0], [0, -step], [0, step],
        ];

        ctx.font      = `bold ${fontSize}px monospace`;
        ctx.fillStyle = `rgba(255,50,50,${depthAlpha.toFixed(3)})`;
        for (const [dx, dy] of offsets) {
          ctx.fillText(randChar(), sx + dx, sy + dy);
        }
      }
    }
  }

  // ── Loop ─────────────────────────────────────────────────────────────────────

  function loop() {
    if (paused) return;
    render();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId) return;
    paused = false;
    loop();
  }

  function stopLoop() {
    paused = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Scroll fade ───────────────────────────────────────────────────────────────

  function onScroll() {
    const ratio = Math.min(
      window.scrollY / (window.innerHeight * FADE_SCROLL_VH),
      1,
    );
    canvas.style.opacity = String(1 - ratio);
    if (ratio >= 1) {
      if (!paused) stopLoop();
    } else {
      if (paused) startLoop();
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  function init() {
    setLayout();
    initPoints();
    loadLandData(); // async; updates p.land when ready
    loadUserLocation(); // async; adds red marker at visitor's IP location
    window.addEventListener("resize", setLayout, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    startLoop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
