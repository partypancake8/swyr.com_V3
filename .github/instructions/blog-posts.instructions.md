---
applyTo: "private-blog/**"
---

# Blog Post Instructions

This is the private ENTR 403 blog. All posts are static HTML files in `private-blog/posts/`. Posts are registered in `private-blog/blog.js` and rendered automatically on the index page, sorted newest-first.

## Adding a New Post

### Step 1 — Create the HTML file

Copy `private-blog/posts/_template.html` and rename it using a descriptive slug:

```
week-09-project-title.html
extra-credit-topic-name.html
```

**Slug rules:** lowercase, words separated by hyphens, no spaces or special characters.

Replace all placeholder values in the file:

| Placeholder                                      | Replace with                               |
| ------------------------------------------------ | ------------------------------------------ |
| `POST_TITLE_HERE` (in `<title>` and `<h1>`)      | The full post title                        |
| `YYYY-MM-DD` (in `datetime` attribute)           | ISO date, e.g. `2026-04-10`                |
| `Month Day, Year` (display text inside `<time>`) | Human-readable date, e.g. `April 10, 2026` |

Write post content inside the `<div class="blog-post-content">` section.

### Step 2 — Register in blog.js

Open `private-blog/blog.js` and add a new entry to the `POSTS` array. Prepend it at the top of the array so the file stays in reverse-chronological order:

```javascript
const POSTS = [
  {
    title: "Week 9: Post Title Here",
    date: "2026-04-10", // ISO format, must match the datetime attribute in the HTML
    slug: "week-09-post-title", // filename without .html
    excerpt: "One or two sentences summarizing the post.",
  },
  // ... existing posts
];
```

All four fields are required. The `excerpt` surfaces as the preview text on the index page.

## Supported HTML Elements

Inside `.blog-post-content`, use standard HTML:

- **Headings:** `<h2>` for major sections, `<h3>` for subsections (reserve `<h1>` for the post header)
- **Paragraphs:** `<p>`
- **Emphasis:** `<strong>`, `<em>`
- **Lists:** `<ul>`, `<ol>`, `<li>`
- **Quotes:** `<blockquote><p>...</p></blockquote>`
- **Inline code:** `<code>snippet</code>`
- **Code blocks:** `<pre><code>...</code></pre>`
- **Images:** `<figure><img src="..." alt="..."><figcaption>...</figcaption></figure>`
- **Dividers:** `<hr />`
- **Links:** `<a href="...">text</a>`

## File Structure Reference

```
private-blog/
├── index.html          ← Post index (auto-populated by blog.js)
├── blog.js             ← POSTS array lives here — edit this to register posts
├── blog.css            ← Blog-only styles (extends major.css)
└── posts/
    ├── _template.html  ← Copy this for every new post
    └── week-01-*.html  ← Existing posts (reference for content patterns)
```

## Checklist

- [ ] File named with a clean hyphenated slug
- [ ] `<title>` updated
- [ ] `datetime` attribute and display text match and are correct
- [ ] `<h1>` post title filled in
- [ ] Content written in `.blog-post-content`
- [ ] Entry added to `POSTS` array in `blog.js` with all four fields
