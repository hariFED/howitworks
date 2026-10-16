// node site/build.mjs [--no-shots]
// Builds the website into docs/ (served by GitHub Pages): the landing page, the collection page,
// every example sheet with a small site bar, and thumbnails rendered with headless Chrome.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
const shots = !process.argv.includes("--no-shots");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const d of ["", "sheets", "thumbs", "3d"]) mkdirSync(join(out, d), { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CMD = "/blueprint-drawings";

// ---- collect the sheets
const sheets = readdirSync(join(root, "examples"))
  .filter((slug) => existsSync(join(root, "examples", slug, "meta.json")) && existsSync(join(root, "examples", slug, `${slug}.html`)))
  .map((slug) => JSON.parse(readFileSync(join(root, "examples", slug, "meta.json"), "utf8")))
  .sort((a, b) => a.dwg.localeCompare(b.dwg));
const bySlug = Object.fromEntries(sheets.map((m) => [m.slug, m]));

// Short names for the grids: the object, and the idea it stands for.
const SHORT = {
  "floor-pump": ["Floor pump", "Compression"],
  "four-stroke": ["Four-stroke engine", "Pipeline stages"],
  governor: ["Flyball governor", "Feedback control"],
  escapement: ["Lever escapement", "Clock tick"],
  "bottle-jack": ["Bottle jack", "Leverage"],
  "token-bucket": ["WC cistern", "Rate limiting"],
  debounce: ["Door closer", "Debounce"],
  "pin-tumbler": ["Pin tumbler lock", "Authentication"],
  "circuit-breaker": ["Circuit breaker", "Circuit breaker"],
  thermostat: ["Wax thermostat", "Setpoint control"],
  "relief-valve": ["Relief valve", "Back-pressure"],
  differential: ["Differential", "Load balancing"],
  "shock-absorber": ["Shock absorber", "Low-pass filter"],
  "click-pen": ["Click pen", "State machine"],
  "centrifugal-pump": ["Centrifugal pump", "Operating point"],
  "gear-pump": ["Gear pump", "Batching"],
  carburettor: ["Carburettor", "Bernoulli"],
  "pressure-cooker": ["Pressure cooker", "Interlock"],
  "solenoid-valve": ["Solenoid valve", "Amplification"],
  stirling: ["Stirling engine", "Heat engine"],
  "disc-brake": ["Disc brake", "Replication"],
};
const short = (m) => SHORT[m.slug] || [m.title, m.domain || ""];

const BUILD = Date.now().toString(36);
const CROPS = JSON.parse(readFileSync(join(root, "site", "crops.json"), "utf8"));
// grow a box by a margin, then to an aspect ratio, about its centre
const pad = ([x, y, w, h], m, aspect) => {
  const cx = x + w / 2, cy = y + h / 2;
  w *= 1 + 2 * m; h *= 1 + 2 * m;
  if (aspect) { if (w / h < aspect) w = h * aspect; else h = w / aspect; }
  return [cx - w / 2, cy - h / 2, w, h].map((v) => Math.round(v));
};
const shot = (page, png, args) => {
  execFileSync(process.execPath, [join(root, "scripts", "shot.mjs"), page, "--out", png, ...args], { stdio: "pipe" });
};

// ---- the sheets themselves, with a site bar; thumbnails in the paper and dark themes
sheets.forEach((m, i) => {
  const prev = sheets[(i - 1 + sheets.length) % sheets.length];
  const next = sheets[(i + 1) % sheets.length];
  const src = join(root, "examples", m.slug, `${m.slug}.html`);
  let html = readFileSync(src, "utf8");
  const bar = `<nav class="site-bar" aria-label="Blueprint">
<a href="../">← Blueprint</a><span>${esc(m.dwg)} · ${esc(m.title)}</span>
<span class="site-bar-pn"><a href="${prev.slug}.html" aria-label="Previous sheet: ${esc(prev.title)}">‹ ${esc(prev.dwg)}</a><a href="../collection.html">All sheets</a><a href="${next.slug}.html" aria-label="Next sheet: ${esc(next.title)}">${esc(next.dwg)} ›</a></span>
</nav>
<style>
.site-bar{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;justify-content:space-between;max-width:1480px;margin:0 auto;padding:12px 16px 0;box-sizing:border-box;font:12px/1.4 var(--bp-font);color:var(--bp-muted);letter-spacing:.04em;text-transform:uppercase}
.site-bar a{color:var(--bp-ink);text-decoration:none}.site-bar a:hover{text-decoration:underline}
.site-bar-pn{display:flex;gap:14px}
html.in-frame .site-bar{display:none}
html.in-frame,html.in-frame body{overflow:hidden}
html.in-frame .bp-page{padding:8px 8px 10px}
</style>
<script>try{if(window.top!==window)document.documentElement.classList.add("in-frame")}catch(e){document.documentElement.classList.add("in-frame")}</script>`;
  html = html.replace("<body>", `<body>\n${bar}`);
  writeFileSync(join(out, "sheets", `${m.slug}.html`), html);
  const src3d = join(root, "examples", m.slug, `${m.slug}-3d.html`);
  m.has3d = Boolean(m.has3d && existsSync(src3d));
  if (m.has3d) {
    // the 3D page links its 2D sheet by file name; point it at the site's copy
    writeFileSync(join(out, "3d", `${m.slug}.html`), readFileSync(src3d, "utf8").split(`href="${m.slug}.html"`).join(`href="../sheets/${m.slug}.html"`));
    const hero = join(root, "examples", m.slug, "shots3d", "hero.png");
    if (existsSync(hero)) copyFileSync(hero, join(out, "thumbs", `${m.slug}-3d.png`));
  }
  const thumb = join(out, "thumbs", `${m.slug}.png`);
  if (shots || !existsSync(thumb)) {
    shot(src, thumb, ["--zoom", pad(CROPS[m.slug] || [0, 0, 1200, 848], 0.06, 4 / 3).join(","), "--mask", pad(CROPS[m.slug] || [0, 0, 1200, 848], 0.025).join(","), "--width", "960", "--height", "720", "--t", String(m.shotT ?? 3), "--theme", "white"]);
    console.log(`thumb  ${m.slug}`);
  }
});

const pump = join(root, "examples", "floor-pump", "floor-pump.html");
for (const theme of ["blueprint", "paper", "white", "dark"]) {
  const png = join(out, "thumbs", `theme-${theme}.png`);
  if (shots || !existsSync(png)) shot(pump, png, ["--zoom", "380,270,420,297", "--width", "840", "--height", "594", "--t", "1.0", "--theme", theme]);
}
if (shots || !existsSync(join(out, "og.png"))) shot(join(root, "examples", "escapement", "escapement.html"), join(out, "og.png"), ["--zoom", pad(CROPS.escapement, 0.04, 1200 / 630).join(","), "--width", "1200", "--height", "630", "--t", "3", "--theme", "white"]);
writeFileSync(join(out, ".nojekyll"), "");

// ---- shared pieces
const total = sheets.length;
const parts = sheets.reduce((n, m) => n + (m.parts || 0), 0);
const img = (slug, cls = "") =>
  `<img class="${cls}" src="thumbs/${slug}.png?v=${BUILD}" alt="${esc(bySlug[slug] ? bySlug[slug].object : "")}" width="960" height="720" loading="lazy">`;
const frame = (slug, title, cls = "") =>
  `<div class="frame ${cls}"><iframe data-src="sheets/${slug}.html?theme=white" title="${esc(title)}" loading="lazy"></iframe></div>`;
// a live sheet zoomed to one view: no frame, no bar, just the object on the page
const solid = (slug, title, q, aspect = "16/10") =>
  `<div class="frame bare" style="aspect-ratio:${aspect}"><iframe data-src="3d/${slug}.html?embed=1&amp;theme=white${q ? "&amp;" + q : ""}" data-zoom="1" title="${esc(title)}"></iframe></div>`;
const live = (slug, title, box, mask) =>
  `<div class="frame bare" style="aspect-ratio:${box[2]}/${box[3]}"><iframe data-src="sheets/${slug}.html?theme=white&amp;zoom=${box.join(",")}${mask ? "&amp;mask=" + mask.join(",") : ""}" data-zoom="1" title="${esc(title)}"></iframe></div>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;550;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const CSS = `
:root{
  --page:#fafafa; --ink:#171717; --soft:#404040; --muted:#8a8a8a; --faint:#b5b5b5; --rule:#e8e8e8; --card:#fff;
  --code:#f0f0f0; --accent:#c8442b; --link-line:#c9c9c9;
  --sans:"Inter",system-ui,sans-serif; --serif:"EB Garamond",Georgia,serif; --mono:"JetBrains Mono",ui-monospace,Consolas,monospace;
  color-scheme:light;
}

*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--page);color:var(--ink);font:450 14px/20.5px var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01"}
a{color:inherit;text-decoration:underline;text-decoration-color:var(--link-line);text-underline-offset:3px}
a:hover{text-decoration-color:var(--ink)}
em.s,.s{font-family:var(--serif);font-style:italic;font-size:1.08em;letter-spacing:.005em}
code,kbd{font-family:var(--mono);font-size:11.5px;background:var(--code);border-radius:3px;padding:1px 4px}
kbd{border:1px solid var(--rule);border-bottom-width:2px;background:var(--card)}
p{margin:0 0 12px}
.layout{display:grid;grid-template-columns:minmax(16px,1fr) 180px 550px 230px minmax(16px,1fr);column-gap:0;min-height:100vh}
.side{grid-column:2;position:sticky;top:0;align-self:start;height:100vh;padding:40px 0 0;font-size:13px;line-height:20px}
.side a{display:block;color:var(--muted);text-decoration:none;position:relative}
.side a:hover,.side a.on{color:var(--ink)}
.side .brand{color:var(--ink);font-weight:500;display:flex;gap:8px;align-items:center;margin-left:-26px}
.side .brand svg{width:18px;height:18px;flex:none}
.side .group{margin:0 0 22px}
.side .ptr{position:absolute;left:-24px;width:16px;height:20px;color:var(--accent);transition:top .35s cubic-bezier(.3,.7,.2,1);pointer-events:none}
.main{grid-column:3;grid-row:1;padding:40px 0 80px;min-width:0}
.side{grid-row:1 / span 2}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
.head b{font-weight:550}
.head span{color:var(--muted)}
.head .icons{display:flex;gap:12px;color:var(--muted)}
.head .icons a{text-decoration:none}
.tag{font-size:14px;margin:0 0 16px}
.minis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:12px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.minis a{display:block;text-decoration:none}
.minis img{display:block;width:100%;height:auto}
.minis a:hover img{opacity:1}
.meta{display:flex;flex-wrap:wrap;gap:4px 10px;color:var(--muted);font-size:12.5px;margin:12px 0 26px}
.meta a{color:var(--muted)}
.meta i{font-style:normal;color:var(--faint)}
.sn-ref{font-size:9px;vertical-align:super;color:var(--muted);margin-left:1px}
.sn{float:right;clear:right;width:200px;margin:2px -260px 10px 0;font-size:11.5px;line-height:16px;color:var(--muted);position:relative}
.sn b{font-weight:450;color:var(--muted);margin-right:4px}
.wide{position:relative;width:780px;margin:36px 0 30px}
.wide.side-by .controls{position:absolute;left:calc(100% + 24px);bottom:6px;width:170px}
.frame{position:relative;aspect-ratio:1200/890;border-radius:4px;overflow:hidden;background:var(--card);box-shadow:0 0 0 1px var(--rule)}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.frame.bare{background:none;box-shadow:none;border-radius:0}
.wide.narrow{width:440px;margin-left:auto;margin-right:auto}
.wide.hero{margin:30px 0 26px}
.minis img,.grid img,.six img,.coll article img{background:var(--page)}

.controls{font-size:12px;line-height:20px;color:var(--muted)}
.controls div{display:flex;gap:8px;align-items:center;margin:4px 0}
.controls kbd{min-width:20px;text-align:center}
.controls .read{margin-top:10px;color:var(--soft)}
section{padding-top:56px;clear:both}
h2{display:flex;align-items:center;gap:14px;font-size:14px;font-weight:550;margin:0 0 18px;scroll-margin-top:24px}
h2::after{content:"";flex:1;height:1px;background:var(--rule);order:1}
h2 .n{order:2;font-family:var(--serif);font-style:italic;font-weight:400;color:var(--muted);font-size:15px}
.quote{font-family:var(--serif);font-size:25px;line-height:1.2;margin:26px 0 4px;letter-spacing:-.005em}
.quote-src{color:var(--muted);font-size:12px;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px 10px;margin:26px 0 22px;text-align:center}
.grid a{text-decoration:none;display:block}
.grid img{display:block;width:100%;height:auto;border-radius:3px;margin-bottom:6px}
.grid b{display:block;font-weight:500;font-size:12px;line-height:15px}
.grid span{display:block;color:var(--muted);font-size:11.5px;line-height:15px}
.rows{display:grid;grid-template-columns:120px 1fr;column-gap:14px;margin:18px 0;border-top:1px solid var(--rule)}
.rows>div{padding:9px 0;border-bottom:1px solid var(--rule)}
.rows>div:nth-child(odd){color:var(--muted)}
.rows code{font-size:11px}
.card{background:var(--card);border-radius:8px;box-shadow:0 0 0 1px var(--rule),0 1px 2px rgba(0,0,0,.03);padding:6px 14px;margin:18px 0}
.card .rows{border-top:0;margin:0}
.card .rows>div:nth-last-child(-n+2){border-bottom:0}
.card .rows .cmd{color:var(--faint)}
.steps{list-style:none;margin:18px 0;padding:0;border-top:1px solid var(--rule)}
.steps li{display:grid;grid-template-columns:24px 1fr;gap:0;padding:9px 0;border-bottom:1px solid var(--rule);color:var(--soft)}
.steps li span{color:var(--faint)}
.steps b{color:var(--ink);font-weight:550}
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13px}
th{text-align:left;font-weight:450;color:var(--muted);padding:6px 10px 6px 0;border-bottom:1px solid var(--rule)}
td{padding:8px 10px 8px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.rules{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px;margin:18px 0}
.rules b{display:block;font-weight:550}
.rules p{margin:2px 0 0;color:var(--soft)}
.six{display:grid;grid-template-columns:1fr 1fr;gap:22px 18px;margin:22px 0}
.six a{text-decoration:none;display:block}
.six img{display:block;width:100%;height:auto;margin-bottom:8px}
.six b{font-weight:550;display:block}
.six span{display:block;color:var(--muted);font-size:12.5px}
.six em{display:block;font-family:var(--serif);font-size:15px;margin-top:2px}
.uses{margin:18px 0}
.uses>div{padding:12px 0;border-bottom:1px solid var(--rule)}
.uses>div:first-child{border-top:1px solid var(--rule)}
.uses b{font-weight:550}
.uses p{margin:4px 0;color:var(--soft)}
.uses .l{font-size:12.5px;color:var(--muted)}
.uses .l a{color:var(--muted)}
.themes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}
.themes img{display:block;width:100%;height:auto;border-radius:4px;box-shadow:0 0 0 1px var(--rule)}
.themes figure{margin:0}
.themes figcaption{font-size:12px;color:var(--muted);margin-top:4px}
pre{font-family:var(--mono);font-size:11.5px;line-height:18px;background:var(--card);box-shadow:0 0 0 1px var(--rule);border-radius:6px;padding:12px 14px;overflow-x:auto;margin:14px 0}
.install{display:flex;align-items:center;gap:10px;background:var(--card);box-shadow:0 0 0 1px var(--rule);border-radius:6px;padding:10px 12px;margin:14px 0}
.install code{background:none;padding:0;font-size:13px;flex:1;min-width:0;overflow-wrap:anywhere}
.install button{font:inherit;font-size:12px;color:var(--muted);background:none;border:1px solid var(--rule);border-radius:4px;padding:2px 8px;cursor:pointer}
.install button:hover{color:var(--ink)}
details{border-bottom:1px solid var(--rule);padding:10px 0}
details:first-of-type{border-top:1px solid var(--rule)}
summary{cursor:pointer;font-weight:500;list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:"+";display:inline-block;width:18px;color:var(--muted)}
details[open] summary::before{content:"−"}
details p{margin:6px 0 0 18px;color:var(--soft)}
footer{grid-column:3;grid-row:2;border-top:1px solid var(--rule);padding:18px 0 60px;color:var(--muted);font-size:12px;line-height:19px}
footer a{color:var(--muted)}
/* collection */
.coll{grid-column:3 / 5;grid-row:1;padding:40px 0 80px;min-width:0}
.coll .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:26px 22px;margin-top:24px}
.coll article{min-width:0}
.coll article img{display:block;width:100%;height:auto;margin-bottom:10px}
.coll .dwg{font-family:var(--mono);font-size:11px;color:var(--accent)}
.coll h3{font-size:14px;font-weight:550;margin:2px 0}
.coll h3 a{text-decoration:none}
.coll .obj{color:var(--muted);font-size:12.5px;margin:0 0 4px}
.coll .idea{font-family:var(--serif);font-style:italic;font-size:15.5px;line-height:1.3;margin:0 0 6px}
.coll .sum{color:var(--soft);font-size:13px;line-height:19px}
.coll .used{margin:6px 0 0;padding-left:16px;color:var(--soft);font-size:12.5px;line-height:18px}
.coll .facts{color:var(--muted);font-size:12px;margin-top:6px}
@media (max-width:1360px){
  .wide.side-by .controls{position:static;width:auto;display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:10px}
  .wide.side-by .controls .read{width:100%;margin:0}
}
@media (max-width:1100px){
  .layout{grid-template-columns:minmax(16px,1fr) 160px minmax(0,550px) minmax(16px,1fr)}
  .sn{float:none;width:auto;margin:0 0 12px;padding-left:10px;border-left:2px solid var(--rule)}
  .wide{width:100%}
  .wide.side-by .controls{position:static;width:auto;display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:10px}
  .wide.side-by .controls .read{width:100%;margin:0}
  footer{grid-column:3}
  .coll{grid-column:3 / 4}
}
@media (max-width:760px){
  .layout{display:block;padding:0 16px}
  .side{position:static;height:auto;padding:16px 0 0;display:flex;flex-wrap:wrap;gap:4px 14px}
  .side .group{margin:0;display:flex;flex-wrap:wrap;gap:4px 14px}
  .side .group.toc,.side .ptr{display:none}
  .side .brand{margin-left:0}
  .main{padding-top:20px}
  .minis{grid-template-columns:repeat(5,1fr);gap:4px}
  .grid{grid-template-columns:repeat(3,1fr)}
  .six,.rules,.themes{grid-template-columns:1fr}
  .rows{grid-template-columns:1fr}
  .rows>div:nth-child(odd){border-bottom:0;padding-bottom:0}
  .wide{width:100%;left:0;transform:none}
  .frame{aspect-ratio:auto;height:auto}
  .frame iframe{position:static;height:340px}
}
`;

const MARK = `<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="1.5" y="1.5" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 12.5h15M12.5 1.5v15" stroke="currentColor" stroke-width=".7"/><circle cx="6.8" cy="6.8" r="2.6" fill="none" stroke="var(--accent)" stroke-width="1.3"/><path d="M6.8 3.2v7.2M3.2 6.8h7.2" stroke="var(--accent)" stroke-width=".6"/></svg>`;
const PTR = `<svg class="ptr" viewBox="0 0 16 20" aria-hidden="true"><path d="M1 10h9" stroke="currentColor" stroke-width="1"/><path d="M15 10l-6-3v6z" fill="currentColor"/></svg>`;

const TOC = [
  ["cut", "Sections, not diagrams"], ["prompt", "Writing a prompt"], ["does", "What Claude does"],
  ["rules", "Anatomy of a sheet"], ["flat", "Flat and solid"], ["six", "Six sheets, up close"], ["two", "Two big sheets"],
  ["uses", "Where it's useful"], ["themes", "Four themes"], ["code", "In your code"],
  ["install", "Install"], ["limits", "Limits"], ["faq", "Questions"],
];
const H = Object.fromEntries(TOC.map(([id, t], i) => [id, `<h2 id="${id}">${t}<span class="n">${String(i + 1).padStart(2, "0")}</span></h2>`]));

const sidebar = (home) => `<aside class="side">
${home ? PTR : ""}
<div class="group">
<a class="brand" href="${home ? "#" : "./"}">${MARK}Blueprint</a>
<a href="collection.html"${home ? "" : ' class="on"'}>Collection</a>
<a href="https://github.com/hariFED/blueprint">Source</a>
<a href="${home ? "" : "./"}#install">Install</a>
</div>
${home ? `<div class="group toc">${TOC.map(([id, t]) => `<a href="#${id}" data-toc="${id}">${t}</a>`).join("")}</div>` : ""}
</aside>`;

const footer = `<footer>
Made by hariFED with Claude Code. Set in Inter, EB Garamond and JetBrains Mono.<br>
<a href="https://github.com/hariFED/blueprint">Source on GitHub</a> · <a href="https://www.npmjs.com/package/@harifed/blueprint">npm</a> · <a href="https://github.com/hariFED/blueprint/blob/main/LICENSE">MIT licence</a> · Version ${esc(pkg.version)}<br>
Inspired by Ryan's <a href="https://skills.wheresryan.sh/anatomy">Anatomy</a>, which draws the machine; Blueprint draws the drawing.
</footer>`;

const SCRIPT = `<script>
(function () {
  // live iframes start when they come near the screen, in the page's colour scheme
  var fit = function (f) {
    if (f.dataset.zoom) return;
    try { var d = f.contentDocument.documentElement; if (d && d.scrollHeight > 50) { f.parentNode.style.aspectRatio = "auto"; f.parentNode.style.height = d.scrollHeight + "px"; } } catch (e) {}
  };
  var load = function (f) {
    if (f.src) return;
    f.addEventListener("load", function () { fit(f); setTimeout(function () { fit(f); }, 400); });
    f.src = f.dataset.src;
  };
  addEventListener("resize", function () { document.querySelectorAll("iframe[src]").forEach(function (f) { f.parentNode.style.height = ""; f.parentNode.style.aspectRatio = ""; fit(f); }); });
  var frames = document.querySelectorAll("iframe[data-src]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }); }, { rootMargin: "400px" });
    frames.forEach(function (f) { io.observe(f); });
  } else frames.forEach(load);
  // the pointer in the margin follows the section being read
  var ptr = document.querySelector(".ptr"), links = {};
  document.querySelectorAll("[data-toc]").forEach(function (a) { links[a.dataset.toc] = a; });
  var brand = document.querySelector(".side .brand");
  var place = function (a) {
    Object.keys(links).forEach(function (k) { links[k].classList.toggle("on", links[k] === a); });
    if (ptr) ptr.style.top = ((a || brand).offsetTop + (a ? 0 : 0)) + "px";
  };
  place(null);
  if (ptr && "IntersectionObserver" in window) {
    var seen = {};
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target.id] = e.isIntersecting ? e.boundingClientRect.top : undefined; });
      var best = null, bestTop = -Infinity;
      document.querySelectorAll("h2[id]").forEach(function (h) { var t = h.getBoundingClientRect().top; if (t < innerHeight * 0.35 && t > bestTop) { bestTop = t; best = h.id; } });
      place(best ? links[best] : null);
    }, { threshold: [0, 1] });
    document.querySelectorAll("section").forEach(function (s) { so.observe(s); });
    addEventListener("scroll", function () {
      var best = null, bestTop = -Infinity;
      document.querySelectorAll("h2[id]").forEach(function (h) { var t = h.getBoundingClientRect().top; if (t < innerHeight * 0.35 && t > bestTop) { bestTop = t; best = h.id; } });
      place(best ? links[best] : null);
    }, { passive: true });
  }
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.getElementById(b.dataset.copy).textContent;
      try { navigator.clipboard.writeText(t).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500); }); } catch (e) {}
    });
  });
})();
</script>`;

const head = (title, desc) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="og.png">
<meta name="twitter:card" content="summary_large_image">
${FONTS}
<style>${CSS}</style>
</head>
<body>`;

// ---- landing page content
const mini = ["four-stroke", "governor", "pin-tumbler", "centrifugal-pump", "carburettor"]
  .filter((s) => bySlug[s]).map((s) => `<a href="sheets/${s}.html" title="${esc(bySlug[s].title)}">${img(s)}</a>`).join("");
const grid = sheets.map((m) => { const [o, i] = short(m); return `<a href="sheets/${m.slug}.html">${img(m.slug)}<b>${esc(o)}</b><span>${esc(i)}${m.has3d ? " · 3D" : ""}</span></a>`; }).join("\n");
const SIX = ["token-bucket", "debounce", "circuit-breaker", "pin-tumbler", "escapement", "differential"].filter((s) => bySlug[s]);
const six = SIX.map((s) => { const m = bySlug[s]; return `<a href="sheets/${s}.html">${img(s)}<b>${esc(short(m)[1])}</b><span>${esc(m.object)}</span><em>${esc(m.idea)}</em></a>`; }).join("\n");

const steps = [
  ["Size it.", "A Sheet is one assembly with 15 to 30 parts and 3 to 5 views; a Set is several sheets. Sheets are built without asking."],
  ["Truth first.", "Write the model: real dimensions, real physics, pure functions. The geometry, the dimensions, the readout and the chart all read it."],
  ["Choose the object and the cut.", "One sentence on what moves and what that motion means, and the one cutting plane that shows it."],
  ["Parts list.", "Every part numbered, with its standard size, a real material grade and a quantity."],
  ["Plan the sheet.", "A main section at a standard scale, details where the mechanism is small, a view in a named direction, a diagram. All laid out in sheet units first."],
  ["Geometry once.", "Each part is a function that draws into any view in millimetres of the real object, so a detail is the same code at a larger scale."],
  ["Draw by the rules.", "Thick visible edges, thin everything else, hatching by material, shafts and balls left uncut, thin walls blacked in."],
  ["Annotate.", "Dimensions measured from the geometry, a balloon on every part, words only where a drafter would put them."],
  ["One accent.", "Exactly one thing gets colour: what to watch, usually the working fluid, its density following pressure."],
  ["Make it live.", "Critically damped motion, an idle tour, drag and keys, dimensions that re-measure, a readout in the title block."],
  ["Check it like a checker.", "A headless browser plays the tour to a dozen moments and fails on any collision; then Claude reads 4× close-ups of every junction."],
].map(([b, t], i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><div><b>${b}</b> ${t}</div></li>`).join("\n");

const rules = [
  ["One cut", "The plane goes through the mechanism. If the reader can't see it, it isn't explained."],
  ["Two weights", "Visible edges thick, everything else thin, 2:1. Hidden, centre and phantom lines by ISO 128."],
  ["Hatch by material", "Steel, iron, aluminium, brass, rubber and plastic each have a pattern; touching parts never share an angle."],
  ["Some things aren't cut", "Shafts, pins, bolts, nuts, balls and ribs are drawn whole, as a drafter would."],
  ["Measured, not typed", "Every dimension is computed from the points it spans. A live one re-measures every frame."],
  ["Balloons on parts", "A dot on the part, a leader and a number that matches the parts list. The check fails if the dot misses."],
  ["One accent", "Colour only for the subject: the air, the oil, the steam. The chart's curve wears it too."],
  ["True numbers", "The readout, the dial, the curve and the drawing read one model, so they can't disagree."],
].map(([b, t]) => `<div><b>${b}</b><p>${t}</p></div>`).join("\n");

const uses = [
  ["Explaining software ideas", "Rate limits, debounce, circuit breakers, back-pressure and state machines were mechanisms long before they were code. Draw the machine and the abstraction stops being abstract.", ["token-bucket", "debounce", "circuit-breaker", "relief-valve", "pin-tumbler", "click-pen", "differential", "shock-absorber"]],
  ["Teaching physics and engineering", "A model you can push. Change one thing and watch the pressure, the curve and the numbers follow, from the same equations.", ["floor-pump", "bottle-jack", "stirling", "four-stroke", "pressure-cooker", "carburettor", "governor"]],
  ["Product pages and documentation", "Show what's inside: the seal, the valve, the spring. A live section sells engineering better than a render.", ["disc-brake", "solenoid-valve", "click-pen", "pressure-cooker", "centrifugal-pump"]],
  ["Technician and apprentice training", "Real part names, standard sizes, material grades and a parts list that matches a teardown.", ["four-stroke", "thermostat", "disc-brake", "centrifugal-pump", "gear-pump", "relief-valve"]],
].map(([h, p, l]) => `<div><b>${h}</b><p>${p}</p><div class="l">${l.filter((s) => bySlug[s]).map((s) => `<a href="sheets/${s}.html">${esc(short(bySlug[s])[0])}</a>`).join(" · ")}</div></div>`).join("\n");

const faqs = [
  ["Do I need a framework?", "No. A sheet is one standalone HTML file with inline SVG and a few kilobytes of plain JavaScript. Open it from disk, host it anywhere, or put it in an iframe."],
  ["Can I edit a sheet afterwards?", "Yes. The model, the parts and the page are separate small files. Ask Claude to change a part, a dimension or the tour, then rebuild with <code>node build.mjs</code>."],
  ["Is it accessible?", "Every sheet has keyboard controls and a polite screen-reader readout of the live numbers. It shows a still, settled frame under reduced motion and pauses when off screen."],
  ["How accurate are the drawings?", "Proportions, standard parts and materials are real and the physics is a genuine model, but these are explanatory drawings, not manufacturing drawings."],
  ["Is the 3D view a separate model?", "No. It imports the same model file as the sheet and builds its solids from the same dimensions. It needs WebGL and loads three.js from a CDN; if either is missing it links to the 2D sheet."],
  ["How do I get the best results?", "Name the real object if you know one, say what you want to watch, and ask for one Sheet first. Then ask for a second look: most problems show up in the close-ups."],
  ["What licence?", "MIT, for the skill, the kit and every sheet."],
].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("\n");

const index = `${head("Blueprint · a skill for Claude Code", `Name a mechanism, or an idea, and Claude drafts the live engineering drawing that explains it. ${total} sheets, all live.`)}
<div class="layout">
${sidebar(true)}
<main class="main">
<div class="head"><div><b>Blueprint</b> <span>· a skill for Claude Code</span></div><div class="icons"><a href="https://github.com/hariFED/blueprint" aria-label="Source on GitHub">GitHub</a></div></div>
<p class="tag">Name a mechanism, or an idea, and Claude drafts <em class="s">the drawing</em> that explains it.</p>
<div class="minis">${mini}</div>
<div class="meta"><span>${CMD}</span><i>·</i><a href="collection.html">${total} sheets, all live</a><i>·</i><span>${parts} drawn parts</span><i>·</i><span>by hariFED</span><i>·</i><span>15 October 2026</span><i>·</i><a href="#install">Install ↓</a></div>

<p>Most explanations of how something works are boxes and arrows. A drafting office never drew boxes. It drew <em class="s">the thing itself</em>, cut open along the plane where the mechanism lives, with every part named, measured and made of something.</p>
<p>Blueprint is a skill for Claude Code that does this. You name a mechanism or an idea, Claude picks the real object whose working <em class="s">is</em> the idea, and drafts it as a live A2 engineering sheet: a section through the mechanism, details at larger scale, dimensions, balloons, a parts list and a title block. Then the parts move, and every number on the sheet comes from <a href="#rules">one physical model</a>.</p>

<div class="wide side-by hero">
${solid("floor-pump", "Live 3D cutaway: the base of a bicycle floor pump", "cut=1&amp;zoom=5.6&amp;look=55,55,0&amp;balloons=0", "16/9")}
<div class="controls">
<div><kbd>↻</kbd> drag to turn</div>
<div><kbd>Space</kbd> pump</div>
<div><kbd>E</kbd> apart</div>
<div><kbd>C</kbd> cut</div>
<p class="read">Boyle's law · 2 bar → 6.8 bar · dead volume 10.1 cm³</p>
</div>
</div>

<span class="sn"><b>1</b>The 3D view and the 2D sheet run the same model file, so their numbers can't disagree.</span>
<p>This is the base of a bicycle floor pump, cut in half. Press <kbd>Space</kbd> to pump: the air, stippled orange, thickens as the piston comes down, and the steel ball lifts off its seat the moment the chamber passes tyre pressure, because it is <em class="s">the outlet valve</em>. Drag to turn it; press <kbd>E</kbd> to take it apart.<span class="sn-ref">1</span></p>
<p>Behind it is a full engineering drawing: an A2 sheet with the section at 1:2.5, two details, a gauge view, a P–s diagram, 21 balloons, a parts list and a title block, all live. Blueprint draws <a href="#flat">both</a>.</p>

<section>${H.cut}
<p>The skill rests on one rule, written at the top of its instructions above everything else:</p>
<p class="quote">The cut is the explanation.</p>
<p class="quote-src">SKILL.md, "The one idea that matters"</p>
<p>Claude has to choose a real, well-made object whose mechanism <em class="s">is</em> the concept, then choose the one cutting plane that exposes it: the bore, the seat, the spring, the passage.</p>
<span class="sn"><b>2</b>Every sheet's model is pure functions with no DOM, so the build, the page and the check all agree.</span>
<p>A sheet fails in two ways. <b>A diagram dressed as a drawing:</b> boxes with hatching and arrows with dimension heads. <b>A drawing that shows nothing:</b> the outside of a closed casing. The cure for both is the same: real parts, made of real materials, that touch and hold each other, cut open.<span class="sn-ref">2</span></p>
<p>Some ideas map almost by themselves. A rate limiter is a cistern with a fixed refill jet. Debounce is a door closer: every push restarts the closing. A circuit breaker is, well, a circuit breaker, and its three states are the software pattern's three names.</p>
<div class="grid">${grid}</div>
<p>None of these were drawn by hand. Each one started from a single line naming the object or the idea. There are ${total} so far, all live in <a href="collection.html">the collection</a>.</p>
</section>

<section>${H.prompt}
<p>The prompt is <em class="s">the idea</em>, not the drawing. "Explain how a token bucket rate limiter works" is enough; deciding that it should be a WC cistern is the part Claude is asked to do.</p>
<p>A few words change what you get:</p>
<div class="rows">
<div><code>paper</code> · <code>dark</code></div><div>Sets the default theme. Every sheet ships with blueprint, paper and dark; the reader can switch.</div>
<div><code>set</code></div><div>Several sheets of one machine, one sub-assembly per A2. Claude proposes the first sheet before starting.</div>
<div><code>still</code></div><div>A drawing without the live layer: no tour, no drag, just the sheet.</div>
</div>
<div class="card"><div class="rows">
<div>Name the idea</div><div><span class="cmd">${CMD}</span> explain how debounce works</div>
<div>Name the object</div><div><span class="cmd">${CMD}</span> a hydraulic bottle jack, 2 tonnes, with the release valve in detail</div>
<div>Pick a theme</div><div><span class="cmd">${CMD}</span> how does a pressure cooker cook faster? <code>paper</code></div>
<div>Ask for a set</div><div><span class="cmd">${CMD}</span> a four-stroke engine, head and bottom end, <code>set</code></div>
<div>Say where it goes</div><div><span class="cmd">${CMD}</span> a circuit breaker for our resilience docs, <code>dark</code></div>
</div></div>
<span class="sn"><b>3</b>Until a request matches, Claude sees only the skill's name and description. It reads the rest when it needs it.</span>
<p>You don't always need the command. The skill's description covers any request for a blueprint, a cutaway, a technical drawing or a "how it works" sheet, so Claude reaches for it on its own.<span class="sn-ref">3</span></p>
</section>

<section>${H.does}
<p>Between your line and the finished sheet, Claude works through a fixed order. The model and the parts list are written before a single line is drawn.</p>
<ol class="steps">${steps}</ol>
<table><thead><tr><th>Size</th><th>What it is</th><th>Parts</th><th>Time</th></tr></thead><tbody>
<tr><td>Sheet</td><td>One A2: main section, details, a view, a diagram, parts list, title block</td><td>15–30</td><td>about 1 h</td></tr>
<tr><td>Set</td><td>Several sheets of one machine</td><td>40+</td><td>several hours</td></tr>
</tbody></table>
</section>

<section>${H.rules}
<p>These are the rules a drafting checker would mark you down for, from ISO 128, 129, 5455 and 7200. The kit makes them easy, and the check makes them hard to break.</p>
<div class="rules">${rules}</div>
<p>Here they are on one whole sheet: a bicycle floor pump, drafted at 1:2.5 with two details, a gauge view, a P–s diagram, 21 balloons, a parts list and a title block whose readout is live. Drag the handle and the stroke dimension re-measures itself.</p>
<div class="wide">${frame("floor-pump", "Live drawing: bicycle floor pump, the whole A2 sheet")}</div>
</section>

<section>${H.flat}
<p>Every sheet is a flat drawing first, because a flat section is where dimensions, scales and standards live. Here is the same kind of mechanism, a watch escapement, drawn flat at 20:1 and still running:</p>
<div class="wide">${live("escapement", "Live drawing: Swiss lever escapement, plan view at 20:1", [36, 34, 745, 420], [36, 34, 745, 420])}</div>
<p>Then, where shape and assembly are the point, Claude builds a <em class="s">solid</em> view from the same numbers: turned with the mouse, cut along the drawing's own section plane with hatched faces, and pulled apart into an exploded view. Add <code>3d</code> to the request. ${(() => { const l = sheets.filter((m) => m.has3d); return l.length ? `${l.length === 1 ? "One sheet has" : l.length + " sheets have"} a 3D view so far: ${l.map((m) => `<a href="3d/${m.slug}.html">${esc(short(m)[0])}</a>`).join(", ")}.` : ""; })()}</p>
${sheets.some((m) => m.has3d && m.slug !== "floor-pump") ? `<div class="six">${sheets.filter((m) => m.has3d && m.slug !== "floor-pump" && existsSync(join(out, "thumbs", m.slug + "-3d.png"))).slice(0, 6).map((m) => `<a href="3d/${m.slug}.html"><img src="thumbs/${m.slug}-3d.png?v=${BUILD}" alt="${esc(m.object)} in 3D" loading="lazy"><b>${esc(short(m)[0])}</b><span>${esc(short(m)[1])} · 3D</span></a>`).join("")}</div>` : ""}
</section>

<section>${H.six}
<p>Six of the sheets that explain software ideas, each a real mechanism doing the same thing.</p>
<div class="six">${six}</div>
</section>

<section>${H.two}
<p>Two of the densest sheets. The four-stroke engine runs an Otto cycle at 6000 rpm with valve timing from the cam profiles; the flame grows from the plug and the P–V loop traces live. Drag the crank, or press <kbd>Space</kbd>.</p>
<div class="wide narrow">${live("four-stroke", "Live drawing: four-stroke engine in section", pad(CROPS["four-stroke"], 0.04), pad(CROPS["four-stroke"], 0.03))}</div>
<p>The centrifugal pump is cut twice, through the shaft and through the volute. The duty point slides along the pump curve as the speed changes and the valve throttles; below 1674 rpm it can't lift the water and nothing flows.</p>
<div class="wide">${live("centrifugal-pump", "Live drawing: centrifugal pump, section through the shaft", pad(CROPS["centrifugal-pump"], 0.04), pad(CROPS["centrifugal-pump"], 0.03))}</div>
</section>

<section>${H.uses}
<p>A live section is useful wherever someone needs to see inside something and trust what they see.</p>
<div class="uses">${uses}</div>
</section>

<section>${H.themes}
<p>Colours are tokens, never values, so every sheet comes in four themes: blueprint, paper, white and dark. Pick one in the sheet's bar, or add <code>?theme=</code> to its address.</p>
<div class="themes">
<figure><img src="thumbs/theme-blueprint.png" alt="Floor pump detail, blueprint theme" width="840" height="594" loading="lazy"><figcaption>blueprint</figcaption></figure>
<figure><img src="thumbs/theme-paper.png" alt="Floor pump detail, paper theme" width="840" height="594" loading="lazy"><figcaption>paper</figcaption></figure>
<figure><img src="thumbs/theme-white.png" alt="Floor pump detail, white theme" width="840" height="594" loading="lazy"><figcaption>white</figcaption></figure>
<figure><img src="thumbs/theme-dark.png" alt="Floor pump detail, dark theme" width="840" height="594" loading="lazy"><figcaption>dark</figcaption></figure>
</div>
</section>

<section>${H.code}
<p>A sheet is a single HTML file: inline SVG, inlined CSS and plain JavaScript. Embed one anywhere:</p>
<pre>&lt;iframe src="floor-pump.html?theme=white" style="width:100%;aspect-ratio:1200/905;border:0"&gt;&lt;/iframe&gt;</pre>
<p>The drafting kit is pure functions that return SVG strings, so it runs in Node and in the page:</p>
<pre>npm install @harifed/blueprint

import * as K from "@harifed/blueprint/kit/draft";

const V = K.view({ x: 190, y: 780, scale: 1 / 2.5 });
const barrel = K.revolve([[16, 34], [17.5, 34], [17.5, 384], [16, 384]]);
svg += K.section(V, barrel, { mat: "alu", angle: 45 });
svg += K.dim(V, [-17.5, 384], [17.5, 384], { dir: "h", off: -24, prefix: "Ø" });</pre>
<p>Every sheet understands the same addresses:</p>
<div class="rows">
<div><code>?t=6.5</code></div><div>Renders the tour at 6.5 s, the same every time. The screenshots and checks use it.</div>
<div><code>?theme=white</code></div><div>Blueprint, paper, white or dark.</div>
<div><code>?zoom=x,y,w,h</code></div><div>One region of the sheet, filling the window, for close-ups.</div>
<div><code>?check=1</code></div><div>Runs the in-page layout check and writes its findings as JSON.</div>
</div>
</section>

<section>${H.install}
<p>One command copies the skill into <code>~/.claude/skills/blueprint-drawings</code>:</p>
<div class="install"><code id="cmd">npx @harifed/blueprint</code><button type="button" data-copy="cmd">Copy</button></div>
<p>Add <code>--project</code> to install into this project's <code>.claude/skills</code>, or <code>--no-examples</code> for a smaller install. Or clone it:</p>
<pre>git clone https://github.com/hariFED/blueprint ~/.claude/skills/blueprint-drawings</pre>
<p>It needs Node.js 20 or later, and Chrome, Chromium or Edge for the checks. Restart Claude Code, then try:</p>
<pre>${CMD} explain how a mechanical watch keeps time
${CMD} draw a token bucket rate limiter as a machine
${CMD} how does a pressure cooker cook faster?
${CMD} a section through a bicycle disc brake caliper</pre>
</section>

<section>${H.limits}
<p><b>It takes time.</b> A good sheet is about an hour of Claude's work, most of it in the second look: reading close-ups and fixing what a checker would mark down.</p>
<p><b>Explanatory, not manufacturing.</b> Proportions, standard parts and materials are real and the physics is a genuine model, but nobody should machine a part from these sheets.</p>
<p><b>3D is a companion.</b> The 3D view turns, cuts and explodes, but dimensions, scales and the parts list live on the flat sheet. It needs WebGL and a connection to the three.js CDN.</p>
<p><b>The first sheet is a draft.</b> Look at it, say what's wrong, and ask for another pass. The checker catches collisions; only you know whether the explanation lands.</p>
</section>

<section>${H.faq}
${faqs}
</section>
</main>
${footer}
</div>
${SCRIPT}
</body>
</html>
`;
writeFileSync(join(out, "index.html"), index);

// ---- the collection page
const cards = sheets.map((m) => `<article id="${m.slug}">
<a href="sheets/${m.slug}.html">${img(m.slug)}</a>
<div class="dwg">${esc(m.dwg)} · ${esc(m.domain || "")}</div>
<h3><a href="sheets/${m.slug}.html">${esc(m.title)}</a></h3>
<p class="obj">${esc(m.object)}</p>
<p class="idea">${esc(m.idea)}</p>
<p class="sum">${esc(m.summary)}</p>
<ul class="used">${(m.usedFor || []).map((u) => `<li>${esc(u)}</li>`).join("")}</ul>
<p class="facts">${m.parts} parts · ${m.views.length} views · ${esc(m.controls || "")}</p>
${m.has3d ? `<p class="facts"><a href="3d/${m.slug}.html">Open the 3D view →</a></p>` : ""}
</article>`).join("\n");

const collection = `${head("Collection · Blueprint", `All ${total} Blueprint sheets: live engineering drawings that explain mechanisms and ideas.`)}
<div class="layout">
${sidebar(false)}
<main class="coll">
<div class="head"><div><b>Collection</b> <span>· ${total} sheets, all live</span></div></div>
<p class="tag">Every sheet drafted by Claude with the Blueprint skill. Each one passes the layout check at a dozen moments of its tour and at phone width. Open one and drag the moving part.</p>
<div class="cards">${cards}</div>
</main>
${footer}
</div>
${SCRIPT}
</body>
</html>
`;
writeFileSync(join(out, "collection.html"), collection);
console.log(`site   docs/index.html + collection.html · ${total} sheets`);
