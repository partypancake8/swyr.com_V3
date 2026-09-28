// Fetch Sawyer's GitHub contribution calendar into src/data/contributions.json.
// Runs as `prebuild`. Never fails the build: on any error the committed JSON is kept.
//   1. GraphQL contributionsCollection when a token is available (GITHUB_TOKEN or `gh auth token`)
//   2. Fallback: the public https://github.com/users/<user>/contributions HTML (what Netlify uses)
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USER = 'partypancake8';
const OUT = fileURLToPath(new URL('../src/data/contributions.json', import.meta.url));
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim();
  } catch {
    return null;
  }
}

async function viaGraphQL(tok) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${tok}`, 'Content-Type': 'application/json', 'User-Agent': 'swyr.com-build' },
    body: JSON.stringify({ query, variables: { login: USER } }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error('GraphQL: ' + JSON.stringify(json.errors || json).slice(0, 200));
  const days = cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({
    date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0,
  }));
  return { source: 'graphql', total: cal.totalContributions, days };
}

async function viaHTML() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { 'User-Agent': 'swyr.com-build' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error('HTML: HTTP ' + res.status);
  const html = await res.text();
  const counts = {};
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^(\d[\d,]*) contribution/.exec(m[2].trim());
    counts[m[1]] = n ? parseInt(n[1].replace(/,/g, ''), 10) : 0;
  }
  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="([^"]+)"/.exec(tag)?.[1];
    const level = parseInt(/data-level="(\d)"/.exec(tag)?.[1] ?? '0', 10);
    const id = /id="([^"]+)"/.exec(tag)?.[1];
    if (date) days.push({ date, count: counts[id] ?? 0, level });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const header = /([\d,]+)\s+contributions?\s+in the last year/.exec(html.replace(/\s+/g, ' '));
  const total = header ? parseInt(header[1].replace(/,/g, ''), 10) : days.reduce((s, d) => s + d.count, 0);
  if (days.length < 300) throw new Error('HTML: only ' + days.length + ' days parsed');
  return { source: 'html', total, days };
}

try {
  let data = null;
  const tok = token();
  if (tok) {
    try { data = await viaGraphQL(tok); } catch (e) { console.warn('[contributions]', e.message); }
  }
  if (!data) data = await viaHTML();
  writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), ...data }, null, 0) + '\n');
  console.log(`[contributions] ${data.source}: ${data.total} contributions, ${data.days.length} days`);
} catch (e) {
  console.warn('[contributions] fetch failed, keeping existing data:', e.message);
  if (!existsSync(OUT)) console.warn('[contributions] no existing data file either; the graph will render empty');
}
process.exit(0);
