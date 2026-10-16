// node site/build.mjs [--no-shots]
// Builds the website into docs/ (served by GitHub Pages): the landing page, every example sheet
// with a small site bar, and thumbnails rendered with headless Chrome.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
const shots = !process.argv.includes("--no-shots");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const d of ["", "sheets", "thumbs"]) mkdirSync(join(out, d), { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- collect the sheets
const sheets = readdirSync(join(root, "examples"))
  .filter((slug) => existsSync(join(root, "examples", slug, "meta.json")) && existsSync(join(root, "examples", slug, `${slug}.html`)))
  .map((slug) => JSON.parse(readFileSync(join(root, "examples", slug, "meta.json"), "utf8")))
  .sort((a, b) => a.dwg.localeCompare(b.dwg));

const shot = (page, png, args) => {
  execFileSync(process.execPath, [join(root, "scripts", "shot.mjs"), page, "--out", png, ...args], { stdio: "pipe" });
};

// ---- the sheets themselves, with a site bar
sheets.forEach((m, i) => {
  const prev = sheets[(i - 1 + sheets.length) % sheets.length];
  const next = sheets[(i + 1) % sheets.length];
  const src = join(root, "examples", m.slug, `${m.slug}.html`);
  let html = readFileSync(src, "utf8");
  const bar = `<nav class="site-bar" aria-label="Blueprint">
<a href="../">← Blueprint</a><span>${esc(m.dwg)} · ${esc(m.title)}</span>
<span class="site-bar-pn"><a href="${prev.slug}.html" aria-label="Previous sheet: ${esc(prev.title)}">‹ ${esc(prev.dwg)}</a><a href="${next.slug}.html" aria-label="Next sheet: ${esc(next.title)}">${esc(next.dwg)} ›</a></span>
</nav>
<style>
.site-bar{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;justify-content:space-between;max-width:1480px;margin:0 auto;padding:12px 16px 0;box-sizing:border-box;font:12px/1.4 var(--bp-font);color:var(--bp-muted);letter-spacing:.04em;text-transform:uppercase}
.site-bar a{color:var(--bp-ink);text-decoration:none}.site-bar a:hover{text-decoration:underline}
.site-bar-pn{display:flex;gap:14px}
html.in-frame .site-bar{display:none}
</style>
<script>try{if(window.top!==window)document.documentElement.classList.add("in-frame")}catch(e){document.documentElement.classList.add("in-frame")}</script>`;
  html = html.replace("<body>", `<body>\n${bar}`);
  writeFileSync(join(out, "sheets", `${m.slug}.html`), html);
  const thumb = join(out, "thumbs", `${m.slug}.png`);
  if (shots || !existsSync(thumb)) {
    shot(src, thumb, ["--zoom", "0,0,1200,848", "--width", "960", "--height", "679", "--t", String(m.shotT ?? 3)]);
    console.log(`thumb  ${m.slug}`);
  }
});

// theme previews and the social image, from the floor pump
const pump = join(root, "examples", "floor-pump", "floor-pump.html");
for (const theme of ["blueprint", "paper", "dark"]) {
  const png = join(out, "thumbs", `theme-${theme}.png`);
  if (shots || !existsSync(png)) shot(pump, png, ["--zoom", "380,270,420,297", "--width", "840", "--height", "594", "--t", "1.0", "--theme", theme]);
}
if (shots || !existsSync(join(out, "og.png"))) shot(pump, join(out, "og.png"), ["--zoom", "0,0,1200,630", "--width", "1200", "--height", "630", "--t", "1.0"]);
writeFileSync(join(out, ".nojekyll"), "");

// ---- the landing page
const total = sheets.length;
const parts = sheets.reduce((n, m) => n + (m.parts || 0), 0);
const bySlug = Object.fromEntries(sheets.map((m) => [m.slug, m]));
const link = (slug) => (bySlug[slug] ? `<a href="sheets/${slug}.html">${esc(bySlug[slug].title)}</a>` : "");
const links = (list) => list.filter((s) => bySlug[s]).map(link).join(", ");

const heroThumbs = ["four-stroke", "escapement", "pin-tumbler", "token-bucket", "debounce", "circuit-breaker"]
  .filter((s) => bySlug[s])
  .map((s) => `<a class="mini" href="sheets/${s}.html"><img src="thumbs/${s}.png" alt="" width="160" height="113" loading="lazy"><span>${esc(bySlug[s].title)}</span></a>`)
  .join("");

const pairs = sheets.map((m) => `<li><a href="sheets/${m.slug}.html"><b>${esc(m.title)}</b><span>${esc(m.idea)}</span></a></li>`).join("\n");

const cards = sheets.map((m) => `<article class="card" id="${m.slug}">
<a class="card-img" href="sheets/${m.slug}.html"><img src="thumbs/${m.slug}.png" alt="${esc(m.title)}: ${esc(m.object)}" width="960" height="679" loading="lazy"></a>
<div class="card-body">
<p class="card-meta"><span>${esc(m.dwg)}</span><span>${esc(m.domain || "")}</span><span>${m.parts} parts · ${m.views.length} views</span></p>
<h3><a href="sheets/${m.slug}.html">${esc(m.title)}</a></h3>
<p class="card-object">${esc(m.object)}</p>
<p class="card-idea">${esc(m.idea)}</p>
<p>${esc(m.summary)}</p>
<details><summary>Views and controls</summary><ul>${m.views.map((v) => `<li>${esc(v)}</li>`).join("")}</ul><p class="card-controls">${esc(m.controls || "")}</p></details>
<h4>Where it's useful</h4>
<ul class="used">${(m.usedFor || []).map((u) => `<li>${esc(u)}</li>`).join("")}</ul>
</div>
</article>`).join("\n");

const uses = [
  ["Teaching physics and thermodynamics", "A model you can push. Students change one thing and watch the pressure, the curve and the numbers follow, all from the same equations.", ["floor-pump", "bottle-jack", "stirling", "four-stroke", "pressure-cooker", "carburettor"]],
  ["Explaining software ideas", "Rate limits, debounce, circuit breakers and back-pressure were mechanisms long before they were code. Draw the machine and the abstraction becomes obvious.", ["token-bucket", "debounce", "circuit-breaker", "relief-valve", "pin-tumbler", "differential", "shock-absorber", "click-pen", "governor"]],
  ["Product pages and documentation", "Show what is inside the product: the seal, the valve, the spring. A live section sells engineering better than a render.", ["disc-brake", "solenoid-valve", "click-pen", "floor-pump", "pressure-cooker"]],
  ["Technician and apprentice training", "Real part numbers, real materials, real tolerances. A parts list and balloons that match a teardown.", ["four-stroke", "thermostat", "disc-brake", "centrifugal-pump", "gear-pump", "relief-valve", "differential"]],
  ["Control systems and feedback", "Setpoints, droop, hysteresis and settling, drawn as the governors and valves that first did it.", ["governor", "thermostat", "relief-valve", "token-bucket", "escapement"]],
  ["Process and hydraulic engineering", "Duty points, pump curves, displacement and leakage, at the operating point you choose.", ["centrifugal-pump", "gear-pump", "bottle-jack", "solenoid-valve", "relief-valve"]],
].map(([h, p, list]) => `<div class="use"><h3>${h}</h3><p>${p}</p><p class="use-links">${links(list)}</p></div>`).join("\n");

const steps = [
  ["Size it", "A Sheet is one assembly, 15–30 parts, 3–5 views. A Set is several sheets. Sheets are built without asking; a Set is proposed first."],
  ["Truth first", "A small model with real dimensions and real physics, pure functions, no DOM. Everything on the sheet reads it."],
  ["Choose the object and the cut", "One sentence: what moves, what that motion means, and which cutting plane shows it."],
  ["Parts list", "Every part numbered, with its standard size, a real material grade and a quantity."],
  ["Plan the sheet", "Main view at a standard scale, details where the mechanism is small, a view in a named direction, a diagram. Laid out in sheet units first."],
  ["Geometry once", "Each part is a function that draws into any view, in millimetres of the real object, so a detail is the same code at a larger scale."],
  ["Draw by the rules", "Thick visible edges, thin everything else, hatching by material, shafts and balls left unhatched, thin walls blacked in."],
  ["Annotate", "Dimensions measured from the geometry, a balloon on every part, words only where a drafter would put them."],
  ["One accent", "Exactly one thing carries colour: the thing to watch, usually the working fluid, its density following pressure."],
  ["Make it live", "Critically damped motion, an idle tour, drag and keys, live dimensions, a readout in the title block, stillness under reduced motion."],
  ["Check it like a checker", "A headless browser plays the tour to a dozen moments and fails on any collision; then Claude reads 4× close-ups of every junction."],
].map(([h, p], i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><div><b>${h}.</b> ${p}</div></li>`).join("\n");

const rules = [
  ["One cut", "The plane goes through the mechanism. If the reader can't see it, it isn't explained."],
  ["Two weights", "Visible edges thick, everything else thin, in a ratio of 2:1. Hidden, centre and phantom lines by ISO 128."],
  ["Hatch by material", "Steel, cast iron, aluminium, brass, rubber, plastic each have a pattern; touching parts never share an angle."],
  ["Some things aren't cut", "Shafts, pins, bolts, nuts, balls and ribs are drawn whole, as a drafter would."],
  ["Measured, not typed", "Every dimension is computed from the points it spans. A live one re-measures every frame."],
  ["Balloons on parts", "A dot on the part, a leader, a number, and a parts-list row. The check fails if a dot misses its part."],
  ["One accent", "Colour only for the subject: the air, the oil, the steam. The chart's curve is the same colour."],
  ["True numbers", "The readout, the dial, the curve and the drawing all read one model, so they can't disagree."],
].map(([h, p]) => `<div class="rule"><h3>${h}</h3><p>${p}</p></div>`).join("\n");

const faqs = [
  ["Do I need a framework?", "No. A sheet is one standalone HTML file with inline SVG and a few kilobytes of plain JavaScript. Open it from disk, host it anywhere, or drop it in an iframe."],
  ["Can I edit a sheet afterwards?", "Yes. The geometry, the model and the page are separate small files. Ask Claude to change a part, a dimension or the tour, then rebuild with <code>node build.mjs</code>."],
  ["Is it accessible?", "Each sheet has keyboard controls, a polite screen-reader readout of the live numbers, honours reduced motion by showing a still settled frame, and pauses when off screen."],
  ["How accurate are the drawings?", "The proportions and standard parts are real and the physics is a genuine model, but these are explanatory drawings, not manufacturing drawings. Treat tolerances and materials as plausible, not certified."],
  ["Which themes are there?", "Blueprint, paper and dark, all from CSS tokens. Add <code>?theme=paper</code> to any sheet's URL."],
  ["How do I get the best results?", "Name the real object if you know it, say what you want to watch, and ask for one Sheet first. Then ask for a second look: Claude finds most problems in the close-ups."],
  ["What licence?", "MIT, for the skill, the kit and every example sheet."],
].map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join("\n");

const toc = [
  ["cut", "The cut is the explanation"], ["prompt", "Writing a prompt"], ["does", "What Claude does"],
  ["rules", "Anatomy of a sheet"], ["sheets", `${total} sheets`], ["uses", "Where it's useful"],
  ["themes", "Three themes"], ["code", "In your code"], ["install", "Install"], ["limits", "Limits"], ["faq", "Questions"],
];
const sec = (i, id, title) => `<h2 id="${id}"><span class="sn">${String(i + 1).padStart(2, "0")}</span>${title}</h2>`;
const S = Object.fromEntries(toc.map(([id, t], i) => [id, sec(i, id, t)]));

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blueprint · a skill for Claude Code</title>
<meta name="description" content="Name a mechanism, or an idea, and Claude drafts the live engineering drawing that explains it. ${total} example sheets, all live.">
<meta property="og:title" content="Blueprint · a skill for Claude Code">
<meta property="og:description" content="Live engineering drawings: sectioned, dimensioned and ballooned sheets whose parts move from one physical model.">
<meta property="og:image" content="og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Serif:ital@1&display=swap" rel="stylesheet">
<style>
:root{
  --page:#f3f0e7; --paper:#fbf9f3; --ink:#1b2430; --soft:#3b4655; --muted:#6a7380; --rule:#d9d3c3;
  --blue:#1d4f8f; --blue-soft:#e3eaf3; --accent:#c8442b; --code:#ece7da; --grid:rgba(29,79,143,.06);
  --sans:"IBM Plex Sans",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace; --serif:"IBM Plex Serif",Georgia,serif;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --page:#0d1116; --paper:#131922; --ink:#e3e8ee; --soft:#b9c2cd; --muted:#8892a0; --rule:#26303c;
  --blue:#7fb0ef; --blue-soft:#17263a; --accent:#f08a5d; --code:#18202b; --grid:rgba(127,176,239,.05); color-scheme:dark;
}}
:root[data-theme="dark"]{
  --page:#0d1116; --paper:#131922; --ink:#e3e8ee; --soft:#b9c2cd; --muted:#8892a0; --rule:#26303c;
  --blue:#7fb0ef; --blue-soft:#17263a; --accent:#f08a5d; --code:#18202b; --grid:rgba(127,176,239,.05); color-scheme:dark;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--page);color:var(--ink);font:17px/1.62 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--blue);text-underline-offset:3px}
code,kbd,pre{font-family:var(--mono);font-size:.86em}
code{background:var(--code);padding:1px 5px;border-radius:3px}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
.prose{max-width:720px}
header.top{border-bottom:1px solid var(--rule);background:var(--page);position:sticky;top:0;z-index:5}
header.top .wrap{display:flex;gap:18px;align-items:center;justify-content:space-between;height:52px;font:13px var(--mono);letter-spacing:.03em}
header.top a{color:var(--ink);text-decoration:none}
header.top nav{display:flex;gap:18px;flex-wrap:wrap}
header.top nav a{color:var(--muted)} header.top nav a:hover{color:var(--ink)}
.mark{display:inline-flex;align-items:center;gap:9px;font-weight:500}
.mark svg{width:18px;height:18px}
.hero{padding:64px 0 28px;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:24px 24px}
.eyebrow{font:13px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
h1{font-weight:500;font-size:clamp(40px,7vw,76px);line-height:1.02;letter-spacing:-.025em;margin:0 0 18px}
.tag{font-size:clamp(20px,2.6vw,27px);line-height:1.35;max-width:760px;margin:0 0 28px;color:var(--soft)}
.tag em{font-family:var(--serif);font-style:italic;color:var(--ink)}
.minis{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 22px}
.mini{display:flex;flex-direction:column;gap:6px;width:160px;color:var(--soft);text-decoration:none;font:12px var(--mono)}
.mini img{width:160px;height:auto;border:1px solid var(--rule);border-radius:3px;display:block;background:var(--paper)}
.mini:hover span{color:var(--ink)}
.meta{display:flex;gap:6px 22px;flex-wrap:wrap;font:13px var(--mono);color:var(--muted);margin:0}
.meta a{color:var(--ink)}
.figure{margin:30px 0 8px}
.frame{border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:#0a2747;aspect-ratio:1200/900}
.frame iframe{display:block;width:100%;height:100%;border:0}
.caption{font-size:14px;color:var(--muted);margin:10px 0 0}
.toc{columns:2 260px;gap:32px;list-style:none;padding:20px 0;margin:36px 0 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);font:14px var(--mono)}
.toc li{padding:3px 0;break-inside:avoid}
.toc a{color:var(--ink);text-decoration:none}
.toc a:hover{color:var(--blue)}
.toc span{color:var(--muted);display:inline-block;width:34px}
section{padding:56px 0 8px}
h2{font-weight:500;font-size:clamp(28px,4vw,40px);letter-spacing:-.015em;line-height:1.1;margin:0 0 22px;scroll-margin-top:72px}
.sn{font:14px var(--mono);color:var(--accent);vertical-align:top;margin-right:14px;letter-spacing:.04em}
h3{font-size:18px;font-weight:600;margin:0 0 6px;line-height:1.3}
blockquote{margin:26px 0;padding:4px 0 4px 22px;border-left:3px solid var(--accent);font-family:var(--serif);font-style:italic;font-size:26px;line-height:1.3}
.pairs{list-style:none;padding:0;margin:26px 0 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.pairs a{display:block;height:100%;padding:13px 15px;border:1px solid var(--rule);border-radius:4px;background:var(--paper);text-decoration:none;color:var(--ink)}
.pairs a:hover{background:var(--blue-soft)}
.pairs b{display:block;font-weight:600;font-size:15px}
.pairs span{display:block;color:var(--muted);font-size:14px;line-height:1.4;margin-top:2px}
pre{background:var(--code);padding:14px 16px;border-radius:5px;overflow-x:auto;line-height:1.55;margin:14px 0}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:20px}
.box{background:var(--paper);border:1px solid var(--rule);border-radius:5px;padding:16px 18px}
.box p{margin:0;font-size:15px;color:var(--soft)}
.box code{font-size:13px}
.steps{list-style:none;padding:0;margin:20px 0}
.steps li{display:flex;gap:16px;padding:11px 0;border-top:1px solid var(--rule)}
.steps .n{font:13px var(--mono);color:var(--accent);padding-top:3px;min-width:22px}
table{border-collapse:collapse;width:100%;font-size:15px;margin:18px 0}
th,td{text-align:left;padding:9px 12px 9px 0;border-bottom:1px solid var(--rule);vertical-align:top}
th{font:12px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
.rules{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:22px}
.rule{border-top:2px solid var(--ink);padding-top:10px}
.rule p{margin:0;font-size:15px;color:var(--soft)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:22px;margin-top:26px}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:6px;overflow:hidden;display:flex;flex-direction:column;scroll-margin-top:72px}
.card-img{display:block;background:#0a2747;border-bottom:1px solid var(--rule)}
.card-img img{display:block;width:100%;height:auto}
.card-body{padding:14px 16px 16px}
.card-body p{margin:0 0 9px;font-size:15px;color:var(--soft)}
.card-meta{display:flex;gap:4px 12px;flex-wrap:wrap;font:12px var(--mono)!important;color:var(--muted)!important;letter-spacing:.03em}
.card-meta span:first-child{color:var(--accent)}
.card h3 a{color:var(--ink);text-decoration:none}
.card h3 a:hover{color:var(--blue)}
.card-object{color:var(--muted)!important;font-size:14px!important}
.card-idea{font-family:var(--serif);font-style:italic;color:var(--ink)!important;font-size:17px!important;line-height:1.35}
.card h4{font:12px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px;font-weight:500}
.used{margin:0;padding-left:18px;font-size:14px;color:var(--soft)}
.used li{margin:2px 0}
details summary{cursor:pointer;font-size:14px;color:var(--blue)}
details ul{font-size:14px;color:var(--soft);margin:6px 0;padding-left:18px}
.card-controls{font:12px var(--mono)!important;color:var(--muted)!important}
.uses{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px 30px;margin-top:22px}
.use p{margin:0 0 8px;font-size:15px;color:var(--soft)}
.use-links{font-size:14px!important}
.themes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:20px}
.themes figure{margin:0}
.themes img{width:100%;height:auto;display:block;border:1px solid var(--rule);border-radius:4px}
.themes figcaption{font:13px var(--mono);color:var(--muted);margin-top:6px}
.cmd{display:flex;gap:10px;align-items:center;background:var(--ink);color:var(--page);border-radius:6px;padding:14px 16px;font:16px var(--mono);margin:16px 0;flex-wrap:wrap}
.cmd code{background:none;padding:0;font-size:inherit;flex:1;min-width:0;overflow-wrap:anywhere}
.cmd button{font:13px var(--mono);background:transparent;color:inherit;border:1px solid currentColor;border-radius:4px;padding:4px 10px;cursor:pointer;opacity:.8}
.cmd button:hover{opacity:1}
.faq{border-top:1px solid var(--rule);padding:12px 0}
.faq summary{font-size:17px;color:var(--ink);font-weight:500}
.faq p{margin:8px 0 0;color:var(--soft)}
footer{margin-top:72px;border-top:1px solid var(--rule);padding:26px 0 48px;font:13px var(--mono);color:var(--muted)}
footer .wrap{display:flex;gap:10px 26px;flex-wrap:wrap;justify-content:space-between}
footer a{color:var(--ink)}
@media (max-width:620px){
  body{font-size:16px}
  header.top nav a:not(.keep){display:none}
  .hero{padding-top:40px}
  .cards{grid-template-columns:1fr}
  .mini{width:calc(50% - 6px)} .mini img{width:100%}
}
</style>
</head>
<body>
<header class="top"><div class="wrap">
<a class="mark" href="#"><svg viewBox="0 0 18 18" aria-hidden="true"><rect x="1" y="1" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1 12h16M12 1v16" stroke="currentColor" stroke-width=".8"/><circle cx="6.5" cy="6.5" r="2.6" fill="none" stroke="var(--accent)" stroke-width="1.4"/></svg>Blueprint</a>
<nav aria-label="Sections"><a href="#sheets" class="keep">Sheets</a><a href="#uses">Uses</a><a href="#code">Code</a><a href="#install" class="keep">Install</a><a href="https://github.com/hariFED/blueprint">GitHub</a></nav>
</div></header>

<main>
<div class="hero"><div class="wrap">
<p class="eyebrow">Blueprint · a skill for Claude Code</p>
<h1>The cut is the<br>explanation.</h1>
<p class="tag">Name a mechanism, or an idea, and Claude drafts <em>the engineering drawing</em> that explains it. Sectioned, dimensioned and ballooned, and every part moves.</p>
<div class="minis">${heroThumbs}</div>
<p class="meta"><span>${total} sheets, all live</span><span>${parts} drawn parts</span><span>by hariFED</span><span>15 October 2026</span><a href="#install">Install ↓</a></p>
</div></div>

<div class="wrap">
<figure class="figure">
<div class="frame"><iframe src="sheets/floor-pump.html" title="Live drawing: bicycle floor pump in axial section" loading="lazy"></iframe></div>
<figcaption class="caption">BP-001, a bicycle floor pump in axial section. Drag the handle, or press <kbd>Space</kbd> to pump. The cup seal folds on the upstroke, the ball lifts when the chamber passes tyre pressure, and the stroke dimension measures itself. <a href="sheets/floor-pump.html">Open full size</a>.</figcaption>
</figure>

<ol class="toc">${toc.map(([id, t], i) => `<li><a href="#${id}"><span>${String(i + 1).padStart(2, "0")}</span>${t}</a></li>`).join("")}</ol>

<section>${S.cut}
<div class="prose">
<p>Most explanations of how something works are boxes and arrows. A drafting office never drew boxes. It drew the thing itself, cut open along the plane where the mechanism lives, with every part named, measured and made of something.</p>
<p>Blueprint asks Claude to do the same. Pick the real object whose mechanism <em>is</em> the idea, then pick the one cut that shows it: the bore, the seat, the spring, the passage. Then make it move, from a model honest enough that the readout, the dial, the chart and the drawing can never disagree.</p>
</div>
<blockquote>Choose the real object whose mechanism is the idea, then choose the cut that exposes it.</blockquote>
<p class="prose">Abstract ideas become mechanisms first. A rate limiter is a cistern with a fixed refill. Debounce is a door closer. A circuit breaker is, well, a circuit breaker.</p>
<ul class="pairs">${pairs}</ul>
</section>

<section>${S.prompt}
<div class="prose">
<p>Type <code>/blueprint-drawings</code> and describe the thing. Name a real object if you know one; name an idea if you don't, and Claude will find the mechanism.</p>
<pre>/blueprint-drawings explain how a pin tumbler lock opens
/blueprint-drawings draw debounce as a real mechanism
/blueprint-drawings a hydraulic bottle jack, paper theme
/blueprint-drawings a set: the four-stroke engine, head and bottom end on separate sheets</pre>
</div>
<div class="grid3">
<div class="box"><h3>Sheet</h3><p>The default. One assembly, 15–30 parts, 3–5 views, a model, a tour and the checks. Around an hour of Claude's time.</p></div>
<div class="box"><h3>Set</h3><p>Several sheets: an assembly and its sub-assemblies, each on its own A2. Claude proposes the first sheet before starting.</p></div>
<div class="box"><h3><code>paper</code> · <code>dark</code></h3><p>Every sheet ships with all three themes. Name one to make it the default.</p></div>
</div>
</section>

<section>${S.does}
<p class="prose">The skill is a workflow, a drafting kit and a checker. Claude works in this order, and writes the model and the parts list before it draws a single line.</p>
<ol class="steps">${steps}</ol>
<table>
<thead><tr><th>Size</th><th>What it is</th><th>Parts</th><th>Time</th></tr></thead>
<tbody>
<tr><td>Sheet</td><td>One A2 drawing: main section, details, a view, a diagram, parts list, title block</td><td>15–30</td><td>~1 h</td></tr>
<tr><td>Set</td><td>Several sheets of one machine, one sub-assembly per sheet</td><td>40+</td><td>several hours</td></tr>
</tbody>
</table>
</section>

<section>${S.rules}
<p class="prose">These are the rules a drafting checker would mark you down for, from ISO 128, 129, 5455 and 7200. The kit makes them easy; the check makes them hard to break.</p>
<div class="rules">${rules}</div>
</section>

<section>${S.sheets}
<p class="prose">Every sheet below was drafted by Claude with this skill, passes the layout check at a dozen moments of its tour and at phone width, and runs live. Open one, drag the moving part, and watch the numbers.</p>
<div class="cards">${cards}</div>
</section>

<section>${S.uses}
<p class="prose">A live section is useful wherever someone needs to see inside something and trust what they see.</p>
<div class="uses">${uses}</div>
</section>

<section>${S.themes}
<p class="prose">Colours are tokens, never values, so every sheet has a blueprint, a paper and a dark theme. Pick one in the sheet's bar, or add <code>?theme=</code> to the URL.</p>
<div class="themes">
<figure><img src="thumbs/theme-blueprint.png" alt="Floor pump detail in the blueprint theme" width="840" height="594" loading="lazy"><figcaption>blueprint</figcaption></figure>
<figure><img src="thumbs/theme-paper.png" alt="Floor pump detail in the paper theme" width="840" height="594" loading="lazy"><figcaption>paper</figcaption></figure>
<figure><img src="thumbs/theme-dark.png" alt="Floor pump detail in the dark theme" width="840" height="594" loading="lazy"><figcaption>dark</figcaption></figure>
</div>
</section>

<section>${S.code}
<div class="prose">
<p>A sheet is a single HTML file: inline SVG, inlined CSS and a few kilobytes of plain JavaScript. No framework, no build step at runtime. Embed one anywhere:</p>
<pre>&lt;iframe src="floor-pump.html" style="width:100%;aspect-ratio:1200/900;border:0"&gt;&lt;/iframe&gt;</pre>
<p>The drafting kit is pure functions that return SVG strings, so it runs in Node and in the page. Install the package and use it directly:</p>
<pre>npm install @harifed/blueprint

import * as K from "@harifed/blueprint/kit/draft";

const V = K.view({ x: 190, y: 780, scale: 1 / 2.5 });
const barrel = K.revolve([[16, 34], [17.5, 34], [17.5, 384], [16, 384]]);
svg += K.section(V, barrel, { mat: "alu", angle: 45 });
svg += K.dim(V, [-17.5, 384], [17.5, 384], { dir: "h", off: -24, prefix: "Ø" });</pre>
<p>Every sheet understands the same URL parameters:</p>
</div>
<table>
<thead><tr><th>Parameter</th><th>Does</th></tr></thead>
<tbody>
<tr><td><code>?t=6.5</code></td><td>Renders the tour at 6.5 s, deterministically. Screenshots and tests use it.</td></tr>
<tr><td><code>?theme=paper</code></td><td>Blueprint, paper or dark.</td></tr>
<tr><td><code>?zoom=x,y,w,h</code></td><td>Shows one region of the sheet filling the window, for close-ups.</td></tr>
<tr><td><code>?check=1</code></td><td>Runs the in-page layout check and writes its findings as JSON.</td></tr>
</tbody>
</table>
</section>

<section>${S.install}
<div class="prose">
<p>One command copies the skill into <code>~/.claude/skills/blueprint-drawings</code>:</p>
<div class="cmd"><code id="cmd">npx @harifed/blueprint</code><button type="button" data-copy="cmd">Copy</button></div>
<p>Add <code>--project</code> to install into this project's <code>.claude/skills</code> instead, or <code>--no-examples</code> for a smaller install. Or clone it:</p>
<pre>git clone https://github.com/hariFED/blueprint ~/.claude/skills/blueprint-drawings</pre>
<p>It needs Node.js 20 or later, and Chrome, Chromium or Edge for the checks. Restart Claude Code, then try:</p>
<pre>/blueprint-drawings explain how a mechanical watch keeps time
/blueprint-drawings draw a token bucket rate limiter as a machine
/blueprint-drawings how does a pressure cooker cook faster?
/blueprint-drawings a section through a bicycle disc brake caliper</pre>
</div>
</section>

<section>${S.limits}
<div class="prose">
<p><b>It takes time.</b> A good sheet is about an hour of Claude's work, most of it in the second look: reading close-ups and fixing what a checker would mark down. Ask for a Set only when one sheet isn't enough.</p>
<p><b>Explanatory, not manufacturing.</b> Proportions, standard parts and materials are real and the physics is a genuine model, but nobody should machine a part from these sheets.</p>
<p><b>Flat drawings.</b> Blueprint draws orthographic views and sections, deliberately. If you want a 3D object you can turn, a different skill will serve you better.</p>
<p><b>The first sheet is a draft.</b> Look at it, say what's wrong, and ask for another pass. The checker catches collisions; only you know whether the explanation lands.</p>
</div>
</section>

<section>${S.faq}
<div class="prose">${faqs}</div>
</section>
</div>
</main>

<footer><div class="wrap">
<span>Blueprint ${esc(pkg.version)} · made by hariFED with Claude Code · IBM Plex</span>
<span><a href="https://github.com/hariFED/blueprint">GitHub</a> · <a href="https://www.npmjs.com/package/@harifed/blueprint">npm</a> · <a href="https://github.com/hariFED/blueprint/blob/main/LICENSE">MIT licence</a> · inspired by <a href="https://skills.wheresryan.sh/anatomy">Anatomy</a></span>
</div></footer>

<script>
document.querySelectorAll("[data-copy]").forEach(function (b) {
  b.addEventListener("click", function () {
    var text = document.getElementById(b.dataset.copy).textContent;
    var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1600); };
    try { navigator.clipboard.writeText(text).then(done, function () {}); } catch (e) {}
  });
});
</script>
</body>
</html>
`;
writeFileSync(join(out, "index.html"), page);
console.log(`site   docs/index.html · ${total} sheets`);
