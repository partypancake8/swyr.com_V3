// Render public/documents/sawyer-smith-resume.pdf to page images for the /resume page.
// Run locally (`npm run resume:render`) after replacing the PDF, then commit the output:
// Netlify's build image lacks poppler / ImageMagick, so this is NOT part of prebuild.
// Writes public/documents/resume-pages/page-N.webp (or .png when no WebP encoder exists)
// plus manifest.json with each page's file name and pixel size.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, mkdtempSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(import.meta.dirname, '..');
const PDF = join(ROOT, 'public/documents/sawyer-smith-resume.pdf');
const OUT = join(ROOT, 'public/documents/resume-pages');
const WIDTH = 1700;
const MAX_BYTES = 400 * 1024;

const has = (bin) => { try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; } };
const run = (bin, args) => execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

if (!existsSync(PDF)) { console.log(`render-resume: ${PDF} not found, skipping`); process.exit(0); }
const tmp = mkdtempSync(join(tmpdir(), 'resume-render-'));

let renderer;
if (has('pdftoppm')) {
  renderer = 'pdftoppm';
  run('pdftoppm', ['-png', '-r', '200', '-scale-to-x', String(WIDTH), '-scale-to-y', '-1', PDF, join(tmp, 'page')]);
} else if (has('magick') && has('gs')) {
  renderer = 'magick';
  run('magick', ['-density', '200', PDF, '-resize', `${WIDTH}x`, '-background', 'white', '-alpha', 'remove', join(tmp, 'page-%d.png')]);
} else if (has('sips')) {
  renderer = 'sips (first page only)';
  run('sips', ['-s', 'format', 'png', '-Z', String(Math.round(WIDTH * 11 / 8.5)), PDF, '--out', join(tmp, 'page-1.png')]);
} else if (has('qlmanage')) {
  renderer = 'qlmanage (first page only)';
  run('qlmanage', ['-t', '-s', '2200', '-o', tmp, PDF]);
  const f = readdirSync(tmp).find((n) => n.endsWith('.png'));
  if (f) renameSync(join(tmp, f), join(tmp, 'page-1.png'));
} else {
  console.log('render-resume: no PDF renderer found (pdftoppm, magick+gs, sips, qlmanage), skipping');
  process.exit(0);
}

// Normalise names (pdftoppm zero-pads: page-1.png or page-01.png) and sort by page number.
const pngs = readdirSync(tmp).filter((n) => n.endsWith('.png'))
  .map((n) => ({ n, i: Number(n.match(/(\d+)\.png$/)?.[1] ?? 1) }))
  .sort((a, b) => a.i - b.i);
if (!pngs.length) { console.log('render-resume: renderer produced no pages'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const size = (file) => {
  const o = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  return { width: Number(o.match(/pixelWidth: (\d+)/)[1]), height: Number(o.match(/pixelHeight: (\d+)/)[1]) };
};

const pages = [];
for (const [k, { n }] of pngs.entries()) {
  const src = join(tmp, n);
  const page = k + 1;
  let file = `page-${page}.png`;
  if (has('cwebp')) {
    file = `page-${page}.webp`;
    for (const q of [85, 78, 70, 60, 50]) {
      run('cwebp', ['-quiet', '-q', String(q), src, '-o', join(OUT, file)]);
      if (statSync(join(OUT, file)).size <= MAX_BYTES) break;
    }
  } else if (has('magick')) {
    file = `page-${page}.webp`;
    for (const q of [85, 78, 70, 60, 50]) {
      run('magick', [src, '-quality', String(q), join(OUT, file)]);
      if (statSync(join(OUT, file)).size <= MAX_BYTES) break;
    }
  } else {
    renameSync(src, join(OUT, file));
  }
  const { width, height } = size(has('sips') ? join(OUT, file) : src);
  const bytes = statSync(join(OUT, file)).size;
  pages.push({ src: `/documents/resume-pages/${file}`, width, height });
  console.log(`${file}  ${width}x${height}  ${(bytes / 1024).toFixed(0)} KB`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ renderer, pages }, null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });
console.log(`render-resume: ${pages.length} page(s) via ${renderer}`);
