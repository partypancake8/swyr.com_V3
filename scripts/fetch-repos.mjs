// Fetch public metadata (language, stars, topics, default branch) and the README for
// the repos shown in the Work section. Runs as part of `prebuild`.
// Writes src/data/repos.json and src/data/readmes/<name>.md.
// Uses the gh token when available (higher rate limit), else unauthenticated.
// Never fails the build: on any error the committed files are kept, and a repo that
// is private or missing is left out (its card omits the footer).
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OWNER = 'partypancake8';
const REPOS = ['4square_production', 'MDLive', 'supercaffeinate'];
const README_REPOS = ['MDLive', 'supercaffeinate'];
const OUT = fileURLToPath(new URL('../src/data/repos.json', import.meta.url));
const README_DIR = fileURLToPath(new URL('../src/data/readmes/', import.meta.url));

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim() || null;
  } catch {
    return null;
  }
}
const tok = token();
const headers = (accept) => ({
  'User-Agent': 'swyr.com-build',
  Accept: accept,
  ...(tok ? { Authorization: `bearer ${tok}` } : {}),
});

let prev = {};
try { if (existsSync(OUT)) prev = JSON.parse(readFileSync(OUT, 'utf8')).repos ?? {}; } catch {}

const repos = { ...prev };
let fetched = 0;
for (const name of REPOS) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${name}`, {
      headers: headers('application/vnd.github+json'),
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
      defaultBranch: r.default_branch,
      topics: r.topics ?? [],
    };
    fetched++;
  } catch (e) {
    console.warn(`[repos] ${name}: ${e.message}; keeping cached entry`);
  }
}

mkdirSync(README_DIR, { recursive: true });
let readmes = 0;
for (const name of README_REPOS) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${name}/readme`, {
      headers: headers('application/vnd.github.raw'),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    if (!md.trim()) throw new Error('empty README');
    writeFileSync(`${README_DIR}${name}.md`, md);
    readmes++;
  } catch (e) {
    console.warn(`[repos] README ${name}: ${e.message}; keeping cached copy`);
  }
}

try {
  writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), repos }, null, 2) + '\n');
  console.log(`[repos] ${fetched}/${REPOS.length} repos, ${readmes}/${README_REPOS.length} READMEs fetched`);
} catch (e) {
  console.warn('[repos] could not write cache:', e.message);
}
process.exit(0);
