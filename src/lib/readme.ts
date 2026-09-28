// Render a GitHub README (Sawyer's own repos, so trusted content) to HTML the way
// github.com shows it: GFM via marked, relative image/link paths resolved against
// the repo's default branch, GitHub-style heading ids, and h2s tagged for the live
// breadcrumb.
import { marked } from 'marked';

const OWNER = 'partypancake8';

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/g, '')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function isRelative(url: string) {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url);
}

export function renderReadme(md: string, repo: string, branch: string) {
  const raw = (p: string) => `https://raw.githubusercontent.com/${OWNER}/${repo}/${branch}/${p.replace(/^\.?\//, '')}`;
  const blob = (p: string) => `https://github.com/${OWNER}/${repo}/blob/${branch}/${p.replace(/^\.?\//, '')}`;

  let html = marked.parse(md, { gfm: true, async: false }) as string;

  // Resolve relative paths in both markdown-generated and raw-HTML tags.
  html = html.replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/gi, (m, a, url, b) => (isRelative(url) ? a + raw(url) + b : m));
  html = html.replace(/(<a\b[^>]*?\shref=")([^"]+)(")/gi, (m, a, url, b) => {
    if (!isRelative(url)) return m;
    // links to images open the raw file, like GitHub's image links; others go to the blob view
    return a + (/\.(png|jpe?g|gif|svg|webp)$/i.test(url) ? raw(url) : blob(url)) + b;
  });

  // External links open in a new tab.
  html = html.replace(/<a\b(?![^>]*\btarget=)([^>]*\shref="https?:[^"]*")/gi, '<a target="_blank" rel="noopener"$1');

  // GitHub-style heading ids (deduplicated); h2s also feed the live breadcrumb.
  const seen = new Map<string, number>();
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, level, inner) => {
    let id = slugify(inner);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n) id = `${id}-${n}`;
    const crumb = level === '2' ? ` data-crumb="${inner.replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').toLowerCase().trim()}"` : '';
    return `<h${level} id="${id}"${crumb}>${inner}</h${level}>`;
  });

  // Tables scroll horizontally on narrow screens instead of widening the page.
  html = html.replace(/<table>/g, '<div class="md-table"><table>').replace(/<\/table>/g, '</table></div>');
  // Images load lazily.
  html = html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
  return html;
}
