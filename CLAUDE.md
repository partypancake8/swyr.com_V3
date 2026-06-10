# CLAUDE.md

Guidance for working on **swyr.com** — Sawyer Smith's personal website. My role here is to help scope, add, create, edit, and change the site.

## What this is

A static personal/portfolio site built with **Astro** (no UI framework — plain `.astro` components + vanilla JS/CSS). Black/green theme, magazine-style layout, inspired by [bchiang7/v4](https://github.com/bchiang7/v4). Deployed to **Netlify** from the built `dist/` folder.

## Commands

```bash
npm install      # install deps (first time)
npm run dev      # local dev server (Astro, hot reload)
npm run build    # production build -> dist/
npm run preview  # serve the built dist/ locally
```

- Node v26, npm 11 (Astro `latest`).
- Netlify runs `npm run build` and publishes `dist/` (see `netlify.toml`).

## Repo layout

```
src/
  pages/                 # routes (file-based routing)
    index.astro          # the landing page — hero, about, experience, work, contact
    work/                # experience detail pages (brose.astro, sanhua.astro)
    projects/            # project build-log pages (4square.astro)
  layouts/
    BaseLayout.astro     # <html> shell, global globe canvas, ClientRouter (view transitions)
    LandingLayout.astro  # landing page wrapper: nav + social/email rails + footer
    ProjectLayout.astro  # project/work page wrapper: adds breadcrumb + project.css
  components/
    LandingNav.astro     # sticky header: logo, optional breadcrumb, nav links, hamburger
    SiteFooter.astro     # footer social icons + copyright
    WorkCard.astro       # work/project card (props: title, href, desc, tags[])
  styles/
    major.css            # global + landing styles
    project.css          # project/work page styles
public/                  # served as-is at site root (/)
  js/globe.js            # background 3D text-globe canvas animation
  js/main.js             # hash-divider sizing + nav/scroll behavior
  icons/  images/  documents/  data/land.geojson
```

## How things work

- **No framework, no client islands.** Pages are `.astro` files composed from layouts + components. Interactivity is plain `<script is:inline>` loading files from `public/js/`.
- **View transitions:** `BaseLayout` includes Astro's `ClientRouter`. The background globe canvas uses `transition:persist` so it survives client-side navigation. Body classes are re-applied after `astro:after-swap` via a `data-body-class` attribute on `<html>` — keep that mechanism intact when touching layouts.
- **Globe:** `public/js/globe.js` renders a rotating sphere of unicode chars using `data/land.geojson`; it fades on scroll. Config constants live at the top of the file.
- **Two page types:**
  - Landing sections live in `src/pages/index.astro`, anchored by `#about`, `#experience`, `#work`, `#contact` (matching nav links).
  - Detail pages use `ProjectLayout` with a `title` and optional `breadcrumb` prop.

## Common edits

- **Add a project/work card on the landing page:** add a `<WorkCard ... />` in the `#work` section of `index.astro`, then create the detail page under `src/pages/projects/` or `src/pages/work/` using `ProjectLayout`. Mirror the structure of `projects/4square.astro`.
- **Edit landing copy:** `src/pages/index.astro` (hero / about / experience / contact text).
- **Nav links / breadcrumb:** `src/components/LandingNav.astro`.
- **Social links / email:** appear in `LandingLayout`, `ProjectLayout` (rails) and `SiteFooter` — update all relevant spots. Email is `swyr@swyr.com`; GitHub is `partypancake8`.
- **Resume:** `public/documents/Sawyer Smith Resume 2025.pdf` (linked from nav and contact).
- **Styling:** `major.css` for global/landing, `project.css` for detail pages.

## Git

- Remote `origin` → `github.com/partypancake8/swyr.com_V3` (HTTPS; the SSH form `git@github.com:partypancake8/swyr.com_V3.git` points to the same repo). Connectivity verified.
- Branches of note: `main` (deployed), `feature/private-blog` (a separate private ENTR 403 blog under `private-blog/` — not present on `main`; see `.github/instructions/blog-posts.instructions.md`), plus `coolstuff`, `project_pages`.
- Commit/push only when asked. If on `main`, branch first.

## Conventions

- Match the existing component style: `.astro` frontmatter `interface Props`, kebab/BEM-ish CSS class names (`work-card__title`, `proj-hero`).
- Keep interactivity vanilla — don't introduce React/Vue/etc. or a CSS framework unless asked.
- Images go in `public/images/<group>/`; reference them by absolute path (`/images/...`).
