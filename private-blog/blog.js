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
    title: "3DP Final Project – Sketch Your Idea",
    date: "2026-04-02",
    slug: "week-10-final-project-sketch",
    excerpt:
      "A blueprint-style sketch for my final project: a minimal e-ink weather display that sits on a desk, shows outdoor conditions and indoor humidity, and is designed to feel like a small intentional object rather than just another screen.",
  },
  {
    title: "GroceryHoldinator – Ergo Device Project",
    date: "2026-03-24",
    slug: "week-09-grocery-holdinator",
    excerpt:
      "An ergonomic grocery bag carrier that combines multiple bag handles into one sculpted grip, designed with Fusion 360 Form tools for smooth curves and finger grooves for comfort.",
  },
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
  {
    title: "Idea: AE Ink – Small Desk Weather Display",
    date: "2026-03-15",
    slug: "week-07-ae-ink-weather-display",
    excerpt:
      'A compact desk display that prioritizes the "feels like" temperature and indoor comfort readings, housed in a 3D printed enclosure with a laser-cut wood front panel.',
  },
  {
    title: "3DP Project 3 – Sketch Your Ergo Mouse: The Tooth Buster",
    date: "2026-03-15",
    slug: "week-08-ergo-mouse-tooth-buster",
    excerpt:
      "A brass knuckles-style toothbrush with finger holes for a positive, locked grip and an organic, candle-like rounded profile for extended comfort — reimagining the ergo mouse brief into an unexpected everyday object.",
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
