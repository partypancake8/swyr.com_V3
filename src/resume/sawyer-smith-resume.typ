// Sawyer Smith resume. Build with `npm run resume:pdf`, then `npm run resume:render`.
// Fonts: Montserrat (OFL) in src/resume/fonts.

#let body-size = 10.5pt

#set document(title: "Sawyer Smith Resume", author: "Sawyer Smith")
#set page(paper: "us-letter", margin: (x: 0.75in, y: 0.6in))
#set text(font: "Montserrat", size: body-size, lang: "en")
#set par(leading: 0.58em, spacing: 0.75em)
#show link: set text(fill: rgb("#1155cc"))
#show link: underline

// Section heading with a rule underneath.
#let section(title) = {
  v(1.1em)
  text(weight: "bold", size: 11pt, title)
  v(-0.45em)
  line(length: 100%, stroke: 0.6pt + rgb("#888888"))
  v(0.1em)
}

// Job line: bold company, italic role, date on the right.
#let job(company, role, dates) = {
  v(0.6em)
  [*#company* – #emph(role) #h(1fr) #dates]
}

#let bullets(..items) = list(
  indent: 0.6em,
  body-indent: 0.6em,
  spacing: 0.55em,
  marker: [•],
  ..items,
)

// ---------------------------------------------------------------- header
#text(weight: "bold", size: 15pt)[SAWYER SMITH] \
Birmingham, MI • +1 (248) 550-8616 •
#link("mailto:swyr@swyr.com")[swyr\@swyr.com] •
#link("https://swyr.com")[swyr.com]

#line(length: 100%, stroke: 1pt + rgb("#444444"))

// ---------------------------------------------------------------- education
#section[EDUCATION]

*University of Michigan – School of Information*, Ann Arbor, MI \
*M.S. in Information (MSI)*, User-Centered Agile Development pathway – Accelerated Master's Degree Program, #emph[begins January 2027]

#v(0.5em)
*University of Michigan – College of Engineering*, Ann Arbor, MI \
*B.S.E. Robotics Engineering* – #emph[Expected Winter 2027] #h(1fr) GPA: 3.34 \
Relevant Coursework: Mechatronics, Data Structures, Robot Operating Systems, HRI, OOP

// ---------------------------------------------------------------- experience
#section[EXPERIENCE]

#job[Decypher][Software Developer Intern][Summer 2026]
#bullets(
  [Built full-stack web applications from the database and API layer up to the UI, shipping product features that customers and internal teams used daily.],
  [Developed data integrations that connected external sources into the product's data model and dashboards.],
  [Built internal tools and dashboards that replaced manual workflows with self-serve views for the team.],
  [Worked spec-first with AI-assisted development tools, writing PRDs and specs before implementation to move quickly from idea to shipped feature.],
)

#job[Sanhua Automotive USA][Automotive Engineering Intern][May–Aug 2024]
#bullets(
  [Designed and implemented LabVIEW control software for a water-pump testbench with LIN-based feedback and control.],
  [Assisted in customer warranty analysis and functional testing for thermal management products.],
  [Researched competitor patents and products to benchmark design and performance trends in the EV cooling market.],
  [Created 3D-printed display models for trade shows and internal testing.],
  [Collaborated across engineering and sales teams to ensure accurate technical communication with clients.],
)

#job[Brose North America][Test Release Engineer Intern][May–Aug 2023]
#bullets(
  [Conducted BLDC motor testing using DYNO systems; standardized and updated legacy test procedures.],
  [Coordinated with electronics, design, and acoustics teams to synchronize testing outputs and data integrity.],
  [Produced an internal training video and documentation on DYNO testing to streamline onboarding.],
  [Performed function and controller validation checks using Goepel diagnostic equipment.],
)

#job[Michigan Fabrication][Vice President][Feb 2024–Aug 2025]
#bullets(
  [Led logistics, events, and communications for a 50+ member student maker organization.],
  [Supported member projects with fabrication guidance and ensured safe lab operation.],
  [Helped grow member engagement through workshops and inter-club collaborations.],
)

// ---------------------------------------------------------------- skills
#section[SKILLS]

Python, C++, MATLAB, LabVIEW, HTML/CSS, Git, ROS, Fusion 360, 3D Printing, AutoCAD, Technical Drawing, Microsoft 365, Data Visualization
