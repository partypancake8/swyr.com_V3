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
    title: "The Next 30 Years of 3D Printing",
    date: "2026-01-10",
    slug: "week-01-introduction",
    excerpt:
      "Speculation on how 3D printing will evolve from a niche hobby tool into a basic household appliance.",
  },
  {
    title: "3DP Project 1 – A Better Bottle Opener",
    date: "2026-01-10",
    slug: "week-02-assignment-reflections",
    excerpt:
      "Introducing the FIVE O'CLOCK: a G-Shock style watch with an integrated bottle opener in the bezel.",
  },
  {
    title: "Anti Screen Film Camera Case for iPhone",
    date: "2026-02-02",
    slug: "week-03-anti-screen-camera-case",
    excerpt:
      "A gag phone case that forces film camera behavior by blocking the entire screen except a tiny viewfinder window, paired with a minimal camera app.",
  },
  {
    title: "MagSafe Fisheye Lens Adapter for iPhone",
    date: "2026-02-12",
    slug: "week-04-magsafe-fisheye-lens",
    excerpt:
      "A magnetic lens mount that uses MagSafe to attach a fisheye lens to iPhone cameras, replacing clunky clip-on systems with secure, self-centering attachment.",
  },
  {
    title: "3DP Project 3 – Sketch A Better Mouse Trap",
    date: "2026-02-17",
    slug: "week-05-cable-organizer-remix",
    excerpt:
      "A blueprint-style concept improving an existing cable organizer design by combining two references into a cleaner, more secure, and still support-free printable part.",
  },
  {
    title: "3DP Project 3 – Magnetic Cable Organizer Final",
    date: "2026-02-26",
    slug: "week-06-magnetic-cable-organizer-final",
    excerpt:
      "Final build update: integrated magnets let the organizer snap into place, it manages up to 5 cables, and prints in about 1.5 hours.",
  },
  {
    title: "Extra Credit: Music & Sound in Additive Manufacturing",
    date: "2026-02-26",
    slug: "extra-credit-music-3d-printing",
    excerpt:
      "Exploring a 3D printed 12-hole ocarina—a fully functional musical instrument that demonstrates how additive manufacturing intersects with sound creation and democratizes instrument making.",
  },
  {
    title: "Organic Object Challenge - Coaster Blob",
    date: "2026-03-15",
    slug: "organic-object-coaster-blob",
    excerpt:
      "A 3D-printable drink coaster with a smooth, irregular blob silhouette modeled entirely in Fusion 360's Sculpt environment using T-Spline tools.",
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
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  // Generate HTML for each post
  const postsHTML = sortedPosts
    .map((post) => {
      // Parse date as local time to avoid timezone issues
      const [year, month, day] = post.date.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateFormatted = dateObj.toLocaleDateString("en-US", {
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
