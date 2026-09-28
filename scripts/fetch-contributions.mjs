// Fetch Sawyer's GitHub contribution history into src/data/contributions.json.
// Runs as `prebuild`. Never fails the build: on any error the committed JSON is kept.
//
// Walks back from today until NEED days are collected (the invader graph has 808
// filled cells) or the account's creation date is reached.
//   1. GraphQL contributionsCollection(from, to) in one-year windows when a token is
//      available (GITHUB_TOKEN or `gh auth token`): exact counts.
//   2. Fallback (Netlify): the public https://github.com/users/<user>/contributions page.
//      Verified 2026-09-28: it honors `from` only to the calendar year (from=2023-09-01
//      returns 2023-01-01..2023-12-31), so it is walked one calendar year at a time.
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USER = 'partypancake8';
const NEED = 808;
const OUT = fileURLToPath(new URL('../src/data/contributions.json', import.meta.url));
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const UA = { 'User-Agent': 'swyr.com-build' };
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim() || null;
  } catch {
    return null;
  }
}

async function gql(tok, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...UA, Authorization: `bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!json.data) throw new Error('GraphQL: ' + JSON.stringify(json.errors || json).slice(0, 200));
  return json.data;
}

async function viaGraphQL(tok) {
  const { user } = await gql(tok, 'query($l:String!){user(login:$l){createdAt}}', { l: USER });
  const created = new Date(user.createdAt.slice(0, 10) + 'T00:00:00Z');
  const q = `query($l:String!,$f:DateTime!,$t:DateTime!){user(login:$l){contributionsCollection(from:$f,to:$t){
    contributionCalendar{weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const byDate = new Map();
  let to = new Date(iso(new Date()) + 'T00:00:00Z');
  while (byDate.size < NEED && to >= created) {
    let from = addDays(to, -364);
    if (from < created) from = created;
    const d = await gql(tok, q, { l: USER, f: from.toISOString(), t: new Date(to.getTime() + 86399000).toISOString() });
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const x of w.contributionDays)
        if (x.date >= iso(from) && x.date <= iso(to))
          byDate.set(x.date, { date: x.date, count: x.contributionCount, level: LEVEL[x.contributionLevel] ?? 0 });
    to = addDays(from, -1);
  }
  return { source: 'graphql', created: iso(created), days: [...byDate.values()] };
}

function parseCalendar(html) {
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
  return days;
}

async function viaHTML() {
  const get = async (qs) => {
    const res = await fetch(`https://github.com/users/${USER}/contributions${qs}`, { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('HTML: HTTP ' + res.status);
    return parseCalendar(await res.text());
  };
  const today = iso(new Date());
  const byDate = new Map();
  for (const d of await get('')) if (d.date <= today) byDate.set(d.date, d);
  if (byDate.size < 300) throw new Error('HTML: only ' + byDate.size + ' days parsed');
  let year = Number([...byDate.keys()].sort()[0].slice(0, 4));
  while (byDate.size < NEED && year > 2007) {
    const days = await get(`?from=${year}-01-01&to=${year}-12-31`);
    const active = days.some((d) => d.count > 0);
    for (const d of days) if (!byDate.has(d.date) && d.date <= today) byDate.set(d.date, d);
    year -= 1;
    if (!days.length || (!active && byDate.size >= NEED)) break;
  }
  return { source: 'html', created: null, days: [...byDate.values()] };
}

try {
  let data = null;
  const tok = token();
  if (tok) {
    try { data = await viaGraphQL(tok); } catch (e) { console.warn('[contributions]', e.message); }
  }
  if (!data) data = await viaHTML();
  data.days.sort((a, b) => a.date.localeCompare(b.date));
  const lastYear = data.days.slice(-365).reduce((s, d) => s + d.count, 0);
  writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), ...data, totalLastYear: lastYear }) + '\n');
  console.log(`[contributions] ${data.source}: ${data.days.length} days (${data.days[0].date}..${data.days.at(-1).date}), ${lastYear} in the last 365 days`);
} catch (e) {
  console.warn('[contributions] fetch failed, keeping existing data:', e.message);
  if (!existsSync(OUT)) console.warn('[contributions] no existing data file either; the graph will render empty');
}
process.exit(0);
