// Fetch public metadata (language, stars, visibility) for the repos shown in the
// Work section into src/data/repos.json. Runs as part of `prebuild`.
// Unauthenticated REST API; never fails the build: on any error the committed JSON is kept,
// and a repo that is private or missing is simply left out (its card omits the footer).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OWNER = 'partypancake8';
const REPOS = ['4square_production', 'MDLive', 'supercaffeinate'];
const OUT = fileURLToPath(new URL('../src/data/repos.json', import.meta.url));

let prev = {};
try { if (existsSync(OUT)) prev = JSON.parse(readFileSync(OUT, 'utf8')).repos ?? {}; } catch {}

const repos = { ...prev };
let fetched = 0;
for (const name of REPOS) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${name}`, {
      headers: { 'User-Agent': 'swyr.com-build', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) { delete repos[name]; continue; } // private or gone: omit footer
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const r = await res.json();
    if (r.private) { delete repos[name]; continue; }
    repos[name] = {
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      visibility: r.visibility,
    };
    fetched++;
  } catch (e) {
    console.warn(`[repos] ${name}: ${e.message}; keeping cached entry`);
  }
}
try {
  writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), repos }, null, 2) + '\n');
  console.log(`[repos] ${fetched}/${REPOS.length} fetched`);
} catch (e) {
  console.warn('[repos] could not write cache:', e.message);
}
process.exit(0);
