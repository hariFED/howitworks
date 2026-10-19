// Node-only: assemble a standalone HTML page from a built sheet and the modules the page runs.
// Modules are inlined as namespaces (const K = (() => { ...; return { ... } })()), so a module
// written as `import * as K from "../../kit/draft.mjs"` works unchanged once inlined, as long as
// the page inlines its dependencies under the same names, in dependency order.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const kitPath = (name) => join(here, name);

export function inlineModule(file, name) {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  // flat destructured exports: export const [a, b] = … / export const { a, b: c = 1 } = …
  for (const m of src.matchAll(/^export\s+(?:const|let)\s*[[{]([^=\]}]*(?:=[^,\]}]*[^=\]}]*)*)[\]}]\s*=/gm))
    for (const item of m[1].split(",")) {
      const id = item.replace(/=.*$/s, "").split(":").pop().replace("...", "").trim();
      if (/^[A-Za-z_$][\w$]*$/.test(id)) names.push(id);
    }
  const body = src
    .replace(/^import\s[^;]*?from\s+["'][^"']+["'];?\s*$/gms, "")
    .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm, "");
  return `const ${name} = (() => {\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// A sheet whose folder has a 3D view (build3d.mjs, writing <name>-3d.html) links to it from its bar;
// the 3D page links back with its own "2D sheet" link.
export function link3d(out) {
  if (!existsSync(join(dirname(out), "build3d.mjs"))) return "";
  const name = basename(out, ".html");
  return `<a class="bp-3d" href="${esc(name)}-3d.html" title="Open the 3D view: turn it, cut it, take it apart">3D view →</a>`;
}

// ---------------------------------------------------------------- atlas (references/atlas.md)
// An example can be one level of a machine you zoom into. A part in info.json that is a doorway names
// the example it opens ("open": "<slug>"); a child's meta.json names its parent ("parent", "parentPart",
// "level") and the top names itself ("atlas": true). Everything is resolved here, at build time, from
// the examples/ folder next to this page's own: BP_LINKS (doorway slug → title, idea, has3d, href) and
// the breadcrumb (the parent chain). Hrefs are in the examples/ layout; site/build.mjs rewrites them.
const readJson = (file) => {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  } catch {
    return null;
  }
};
// a sibling example as a link target, or null while it isn't drawn yet ("drawing in progress")
function siblingPage(ex, slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(slug))) return null;
  const dir = join(ex, slug);
  const m = readJson(join(dir, "meta.json"));
  if (!m || !(existsSync(join(dir, `${slug}.html`)) || existsSync(join(dir, "build.mjs")))) return null;
  const has3d = !!m.has3d && (existsSync(join(dir, `${slug}-3d.html`)) || existsSync(join(dir, "build3d.mjs")));
  return { slug, meta: m, has3d, href2d: `../${slug}/${slug}.html`, href3d: has3d ? `../${slug}/${slug}-3d.html` : null };
}
// kind: "2d" | "3d", the page being written. A 3D page goes to a child's 3D view when it has one.
export function atlasOf(out, kind = "2d") {
  const dir = dirname(out);
  const ex = dirname(dir);
  const meta = readJson(join(dir, "meta.json")) ?? {};
  const info = readJson(join(dir, "info.json")) ?? {};
  const slug = meta.slug ?? basename(dir);
  const links = {};
  for (const p of Object.values(info)) {
    if (!p?.open || p.open in links) continue;
    const c = siblingPage(ex, p.open);
    links[p.open] = c ? { title: c.meta.title ?? c.slug, idea: c.meta.idea ?? "", has3d: c.has3d, href: kind === "3d" && c.has3d ? c.href3d : c.href2d, href2d: c.href2d, href3d: c.href3d } : null;
  }
  // the breadcrumb: up the parent chain, each crumb opening its page zoomed on the part that leads here
  const chain = [];
  const seen = new Set([slug]);
  for (let m = meta; m?.parent && !seen.has(m.parent); ) {
    seen.add(m.parent);
    const c = siblingPage(ex, m.parent);
    const pm = c?.meta ?? readJson(join(ex, m.parent, "meta.json"));
    chain.unshift({ slug: m.parent, part: m.parentPart != null ? String(m.parentPart) : "", title: pm?.crumb ?? pm?.title ?? m.parent, href: c ? (kind === "3d" && c.has3d ? c.href3d : c.href2d) : null });
    m = pm;
  }
  const doorways = Object.keys(links).length > 0;
  return { slug, kind, level: meta.level ?? null, parent: meta.parent ?? null, parentPart: meta.parentPart != null ? String(meta.parentPart) : null, atlas: !!meta.atlas, title: meta.crumb ?? meta.title ?? slug, links, chain, active: doorways || chain.length > 0 || !!meta.atlas || meta.level != null };
}

// The bar's breadcrumb (Aircraft › Engine › Cylinder); empty for a page that isn't in an atlas.
// current: false ends it with a "›" into the bar's own title (the 3D page's heading names the page).
export function crumbs(A, { current = true } = {}) {
  if (!A?.chain.length) return "";
  const sep = `<i aria-hidden="true">›</i>`;
  const items = A.chain.map((c) => (c.href ? `<a href="${esc(c.href)}${c.part ? `?focus=${encodeURIComponent(c.part)}` : ""}" data-crumb="${esc(c.slug)}">${esc(c.title)}</a>` : `<span>${esc(c.title)}</span>`));
  if (current) items.push(`<span aria-current="page">${esc(A.title)}</span>`);
  return `<nav class="bp-crumbs" aria-label="Where this sits in the machine">${items.join(sep)}${current ? "" : sep}</nav>`;
}

// Part cards: if the page's folder has an info.json ({ "n": { name, spec, material, qty, note, open } }),
// inline it with kit/info.mjs so hovering, tapping or focusing a balloon names and explains the part.
// writePage and writePage3d both add it; a page without info.json (and outside an atlas) is unchanged.
// On an atlas page it also carries BP_LINKS and the page's place (BP_ATLAS): doorways, ?focus=, ?from=.
export function partCards(out, A = null) {
  const file = join(dirname(out), "info.json");
  const atlas = A?.active ? A : null;
  if (!existsSync(file) && !atlas) return "";
  const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const data = existsSync(file) ? json(JSON.parse(readFileSync(file, "utf8"))) : "{}";
  const extra = atlas ? `, links: BP_LINKS, atlas: BP_ATLAS` : "";
  return `<script>
"use strict";
${atlas ? `const BP_LINKS = ${json(atlas.links)};
const BP_ATLAS = ${json({ slug: atlas.slug, kind: atlas.kind, level: atlas.level, parent: atlas.parent, parentPart: atlas.parentPart, atlas: atlas.atlas })};
` : ""}${inlineModule(kitPath("info.mjs"), "BP_CARDS")}
BP_CARDS.attach({ info: ${data}${extra} });
</script>`;
}

export function writePage(out, { title, description = "", svg, bar = "", css = "", modules = [], main = "", theme = "blueprint" }) {
  const sheetCss = readFileSync(kitPath("sheet.css"), "utf8");
  const A = atlasOf(out, "2d");
  const scripts = modules.map(([file, name]) => inlineModule(file, name)).join("\n");
  const html = `<!doctype html>
<html lang="en" data-theme="${esc(theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<style>
${sheetCss}
${css}
</style>
</head>
<body>
<main class="bp-page">
<figure class="bp-figure">
${svg}
<figcaption class="bp-bar">${crumbs(A)}${bar}${link3d(out)}</figcaption>
</figure>
</main>
<script>
"use strict";
${scripts}
${main}
</script>
${partCards(out, A)}
</body>
</html>
`;
  writeFileSync(out, html);
  return html.length;
}

// ---------------------------------------------------------------- 3D mode
// The three.js build every 3D page loads, pinned. ES module through an import map: works from file://.
export const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

// One standalone 3D page (see references/3d.md). Modules are inlined into a module script after
// `import * as THREE from "three"`, in dependency order, e.g. [[kitPath("draft.mjs"), "K"],
// [kitPath("live.mjs"), "L"], [kitPath("solid3d.mjs"), "S"], [model, "M"], [parts, "P"], [scene3d, "SC"]].
//   heading   the toolbar's title, e.g. "FLOOR PUMP · BP-001 · 3D"
//   titleText the title block's title;  dwg the drawing number;  parts the part count
//   sheet2d   the 2D sheet's file name, linked from the bar and the WebGL/CDN fallback
//   buttons   extra toolbar HTML (the page's own controls);  hint, live: the hint line and readout label
//   aria      the stage's description for screen readers;  theme: default theme (white)
//   projection the title block's PROJECTION; omitted, the kit derives it from the ISO view's az/el
//             (ISOMETRIC at the iso defaults, AXONOMETRIC otherwise; ISOMETRIC without JavaScript)
export function writePage3d(out, { title, description = "", heading, titleText, dwg = "", parts = "", units = "mm", sheet2d = "", buttons = "", hint = "", live = "LIVE", aria = "", css = "", modules = [], main = "", theme = "white", projection = "" }) {
  const scripts = modules.map(([file, name]) => inlineModule(file, name)).join("\n");
  const themes = ["blueprint", "paper", "white", "dark"].map((t) => `<button type="button" data-theme-pick="${t}">${t}</button>`).join("");
  const A = atlasOf(out, "3d");
  const link2d = sheet2d ? `<a href="${esc(sheet2d)}">2D sheet</a>` : "";
  const fallback2d = sheet2d ? ` The 2D sheet, <a href="${esc(sheet2d)}">${esc(sheet2d)}</a>, needs neither.` : "";
  const html = `<!doctype html>
<html lang="en" data-theme="${esc(theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<script>if (/[?&]embed=1(&|$)/.test(location.search)) document.documentElement.classList.add("v3-embed");</script>
<style>
${readFileSync(kitPath("sheet.css"), "utf8")}
${readFileSync(kitPath("sheet3d.css"), "utf8")}
${css}
</style>
<script type="importmap">{ "imports": { "three": "${THREE_URL}" } }</script>
</head>
<body>
<div class="v3">
<div class="v3-bar" role="toolbar" aria-label="View controls">
  ${A.chain.length ? `<span class="bp-crumbs-3d">${crumbs(A, { current: false })}<b>${esc(heading ?? title)}</b></span>` : `<b>${esc(heading ?? title)}</b>`}
  <span class="v3-grp" role="group" aria-label="View"><button type="button" data-view="iso">ISO</button><button type="button" data-view="front">FRONT</button><button type="button" data-view="side">SIDE</button><button type="button" data-view="top">TOP</button></span>
  <span class="v3-grp"><button type="button" id="cut" aria-pressed="true">CUT</button><label>plane <input id="offset" type="range" min="-30" max="30" step="0.5" value="0" aria-label="Cutting plane offset, mm"></label></span>
  <span class="v3-grp"><label>explode <input id="explode" type="range" min="0" max="1" step="0.01" value="0" aria-label="Explode"></label></span>
  <span class="v3-grp"><button type="button" id="balloons" aria-pressed="true">BALLOONS</button>${buttons}</span>
  <span class="bp-themes" role="group" aria-label="Theme">${themes}</span>
  ${link2d}
</div>
<div id="stage" class="v3-stage" tabindex="0" role="img" aria-label="${esc(aria || description)}">
  <canvas id="gl"></canvas>
  <svg id="ov" aria-hidden="true"></svg>
  <div class="v3-hint">${esc(hint || "DRAG TO ORBIT · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · B BALLOONS · 1–4 VIEWS")}</div>
  <div class="v3-title">
    <div class="w3 lg"><i>TITLE</i>${esc(titleText ?? title)}</div><div class="lg"><i>DWG NO</i>${esc(dwg)}</div>
    <div><i>SCALE</i>NTS</div>${projection ? `<div id="v3-proj"><i>PROJECTION</i>${esc(projection)}</div>` : `<div id="v3-proj" data-auto="1"><i>PROJECTION</i>ISOMETRIC</div>`}<div><i>UNITS</i>${esc(units)}</div><div><i>PARTS</i>${esc(parts)}</div>
    <div class="w4"><i>${esc(live)}</i><span id="readout">&nbsp;</span></div>
  </div>
  <noscript><div class="v3-fail"><p>This drawing needs JavaScript and WebGL.${fallback2d}</p></div></noscript>
</div>
<span id="sr" class="bp-sr" aria-live="polite"></span>
</div>
<script>
window.addEventListener("error", (e) => { window.__v3err = String(e.message || e); });
setTimeout(() => {
  if (window.__v3ok) return;
  const d = document.createElement("div");
  d.className = "v3-fail";
  d.id = "v3-fallback";
  d.innerHTML = "<p>The 3D view could not start (" + (window.__v3err || "three.js did not load: it needs WebGL and a connection to cdn.jsdelivr.net").replace(/</g, "&lt;") + ").${fallback2d.replace(/"/g, '\\"')}</p>";
  document.getElementById("stage").appendChild(d);
  // a slow connection or GPU may still bring the scene up: then the notice goes again
  const late = setInterval(() => { if (window.__v3ok) { d.remove(); clearInterval(late); } }, 400);
  setTimeout(() => clearInterval(late), 60000);
}, 8000);
</script>
<script type="module">
import * as THREE from "three";
${scripts}
${main}
</script>
${partCards(out, A)}
</body>
</html>
`;
  writeFileSync(out, html);
  return html.length;
}
