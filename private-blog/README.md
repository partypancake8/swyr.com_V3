# Private Class Blog

A self-contained, unlisted blog section for course notes and reflections. This blog lives on the same domain as the main site but is completely isolated—no links, navigation items, or references exist on the public website.

## Access

**Blog Index:** `/private-blog/` or `/private-blog/index.html`

The blog is accessible only via direct URL. It does not appear in:

- Site navigation
- Sitemaps
- Search engine indexes (via robots meta tag)
- Any public-facing pages

## Structure

```
private-blog/
├── index.html              # Blog landing page (lists all posts)
├── blog.css                # Blog-specific styles (extends site theme)
├── blog.js                 # Post metadata & rendering logic
└── posts/
    ├── _template.html      # Reusable template for new posts
    ├── week-01-introduction.html
    └── week-02-assignment-reflections.html
```

## How to Add a New Post

### Step 1: Create the Post File

1. Copy `/private-blog/posts/_template.html`
2. Rename it to your post slug (e.g., `week-03-data-structures.html`)
3. Edit the file:
   - Update `<title>` tag
   - Change the `<time>` element:
     - `datetime` attribute: ISO format (`2026-01-24`)
     - Display text: `January 24, 2026`
   - Replace `<h1>` with your post title
   - Write your content in the `.blog-post-content` section

### Step 2: Add Metadata to blog.js

Open `/private-blog/blog.js` and add a new entry to the `POSTS` array:

```javascript
const POSTS = [
  // ... existing posts ...
  {
    title: "Week 3: Data Structures Deep Dive",
    date: "2026-01-24",
    slug: "week-03-data-structures",
    excerpt: "Exploring trees, graphs, and their real-world applications.",
  },
];
```

**That's it!** The post will automatically appear on the blog index, sorted newest-first.

## Content Guidelines

### Supported Elements

The blog supports all standard HTML elements with enhanced styling:

- **Headings:** `<h1>`, `<h2>`, `<h3>`
- **Text:** `<p>`, `<strong>`, `<em>`
- **Lists:** `<ul>`, `<ol>`, `<li>`
- **Quotes:** `<blockquote>`
- **Code:** `<code>` (inline), `<pre><code>` (blocks)
- **Links:** `<a href="...">`
- **Images:** `<img>`, `<figure>`, `<figcaption>`
- **Dividers:** `<hr>`

### Typography Hierarchy

```html
<h1>Post Title</h1>
<!-- Only in header -->
<h2>Major Section</h2>
<!-- Top-level sections -->
<h3>Subsection</h3>
<!-- Nested sections -->
```

### Code Formatting

**Inline code:**

```html
<p>Use <code>const</code> for immutable variables.</p>
```

**Code blocks:**

```html
<pre><code>function hello() {
  console.log("Hello, world!");
}</code></pre>
```

### Quotes

```html
<blockquote>
  <p>A meaningful quote or callout.</p>
</blockquote>
```

## Styling

### Theme Inheritance

The blog imports the main site's styles:

```html
<link rel="stylesheet" href="../../src/styles/major.css" />
<link rel="stylesheet" href="../blog.css" />
```

**Color Palette:**

- Primary Accent: `#00ff00` (bright green)
- Background: `#232323` (dark gray)
- Surface: `#0a0a0a` (near black)
- Text: `#f9f9f9` (off-white)

### Custom Blog Styles

`blog.css` adds:

- Post card hover effects
- Enhanced typography for long-form content
- Syntax-highlighted code blocks
- Green-bordered blockquotes
- Responsive grid layouts

## Technical Details

### Static-Only Design

- **No backend:** Pure HTML/CSS/JS
- **No authentication:** Privacy by obscurity (unlisted URL)
- **No build step:** Works on any static host
- **No framework:** Vanilla JavaScript

### JavaScript Functionality

The blog uses minimal JavaScript:

1. **Post List Rendering** (`blog.js`):

   - Reads `POSTS` array
   - Sorts newest-first by date
   - Generates HTML for each post card
   - Injects into `#post-list` container

2. **Hash Dividers** (inline script):
   - Generates dynamic `###` lines
   - Adjusts on window resize

### Graceful Degradation

- **With JS:** Post list renders dynamically on blog index
- **Without JS:** Direct post URLs still work (full HTML pages)
- **Noscript fallback:** Provides manual navigation link

## Maintenance

### Adding Posts

**Frequency:** As needed (weekly, after each class, etc.)

**Time:** ~5 minutes per post

1. Copy template (30 seconds)
2. Write content (3-4 minutes)
3. Add metadata to `blog.js` (30 seconds)

### No Breaking Changes

This blog is completely isolated. You can:

- Modify blog files without affecting the main site
- Change blog styles independently
- Add/remove posts freely
- Experiment with layouts

**Never modify:**

- `/index.html` (main site landing page)
- `/src/pages/*.html` (public pages)
- `/src/styles/major.css` (shared styles)

## Privacy Model

**Security Level:** Unlisted by convention

- ✅ No links from public site
- ✅ `noindex, nofollow` meta tags
- ✅ Direct URL access only
- ❌ No authentication (anyone with URL can access)
- ❌ No encryption (standard HTTP/HTTPS)
- ❌ No access logs or analytics

**Suitable for:**

- Course notes and reflections
- Draft content
- Personal documentation
- Low-stakes writing

**Not suitable for:**

- Sensitive information
- Confidential data
- Private credentials

## Deployment

The blog deploys alongside the main site with no additional configuration:

**Compatible hosts:**

- Netlify
- GitHub Pages
- Vercel
- Any static file server

**No special setup required.** Just push to your repository and the blog will be accessible at `/private-blog/`.

---

## Questions?

This blog is designed to be simple and self-explanatory. If you need to customize:

1. **Styling:** Edit `/private-blog/blog.css`
2. **Layout:** Modify `/private-blog/index.html` or post template
3. **Metadata:** Extend the `POSTS` array in `blog.js` (e.g., add tags, categories)

**Core principle:** Keep it simple. The blog should enhance your workflow, not complicate it.
