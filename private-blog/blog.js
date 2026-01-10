/**
 * Private Blog - Post Metadata & Rendering System
 *
 * HOW TO ADD A NEW POST:
 * 1. Create a new HTML file in /private-blog/posts/ using the template structure
 * 2. Add a new entry to the POSTS array below with:
 *    - title: Post title (string)
 *    - date: ISO date string (YYYY-MM-DD)
 *    - slug: Filename without .html (string)
 *    - excerpt: Short preview text (string, optional)
 * 3. Posts automatically appear on blog index, sorted newest-first
 *
 * Example:
 * {
 *   title: "My New Post",
 *   date: "2026-01-15",
 *   slug: "my-new-post",
 *   excerpt: "A brief description of what this post covers."
 * }
 */

const POSTS = [
  {
    title: "Week 1: Course Introduction",
    date: "2026-01-10",
    slug: "week-01-introduction",
    excerpt:
      "Overview of the course structure, goals, and initial thoughts on the material.",
  },
  {
    title: "Week 2: First Assignment Reflections",
    date: "2026-01-17",
    slug: "week-02-assignment-reflections",
    excerpt:
      "Key takeaways from the first assignment and areas for improvement.",
  },
];

/**
 * Renders the blog post list on the index page
 */
function renderPostList() {
  const container = document.getElementById("post-list");
  if (!container) return;

  // Sort posts newest-first
  const sortedPosts = [...POSTS].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Generate HTML for each post
  const postsHTML = sortedPosts
    .map((post) => {
      const dateFormatted = new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return `
      <article class="blog-post-card">
        <a href="posts/${post.slug}.html" class="post-link">
          <div class="post-meta">
            <time class="post-date" datetime="${
              post.date
            }">${dateFormatted}</time>
          </div>
          <h2 class="post-title">${post.title}</h2>
          ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ""}
        </a>
      </article>
    `;
    })
    .join("");

  container.innerHTML = postsHTML;
}

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderPostList);
} else {
  renderPostList();
}
