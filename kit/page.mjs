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

// Part cards: if the page's folder has an info.json ({ "n": { name, spec, material, qty, note } }),
// inline it with kit/info.mjs so hovering, tapping or focusing a balloon names and explains the part.
// writePage and writePage3d both add it; a page without info.json is unchanged.
export function partCards(out) {
  const file = join(dirname(out), "info.json");
  if (!existsSync(file)) return "";
  const data = JSON.stringify(JSON.parse(readFileSync(file, "utf8"))).replace(/</g, "\\u003c");
  return `<script>
"use strict";
${inlineModule(kitPath("info.mjs"), "BP_CARDS")}
BP_CARDS.attach({ info: ${data} });
</script>`;
}

export function writePage(out, { title, description = "", svg, bar = "", css = "", modules = [], main = "", theme = "blueprint" }) {
  const sheetCss = readFileSync(kitPath("sheet.css"), "utf8");
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
<figcaption class="bp-bar">${bar}${link3d(out)}</figcaption>
</figure>
</main>
<script>
"use strict";
${scripts}
${main}
</script>
${partCards(out)}
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
export function writePage3d(out, { title, description = "", heading, titleText, dwg = "", parts = "", units = "mm", sheet2d = "", buttons = "", hint = "", live = "LIVE", aria = "", css = "", modules = [], main = "", theme = "white" }) {
  const scripts = modules.map(([file, name]) => inlineModule(file, name)).join("\n");
  const themes = ["blueprint", "paper", "white", "dark"].map((t) => `<button type="button" data-theme-pick="${t}">${t}</button>`).join("");
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
  <b>${esc(heading ?? title)}</b>
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
    <div><i>SCALE</i>NTS</div><div><i>PROJECTION</i>ISOMETRIC</div><div><i>UNITS</i>${esc(units)}</div><div><i>PARTS</i>${esc(parts)}</div>
    <div class="w4"><i>${esc(live)}</i><span id="readout">&nbsp;</span></div>
  </div>
  <noscript><div class="v3-fail">This drawing needs JavaScript and WebGL.${fallback2d}</div></noscript>
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
  d.innerHTML = "The 3D view could not start (" + (window.__v3err || "three.js did not load: it needs WebGL and a connection to cdn.jsdelivr.net").replace(/</g, "&lt;") + ").${fallback2d.replace(/"/g, '\\"')}";
  document.getElementById("stage").appendChild(d);
}, 8000);
</script>
<script type="module">
import * as THREE from "three";
${scripts}
${main}
</script>
${partCards(out)}
</body>
</html>
`;
  writeFileSync(out, html);
  return html.length;
}
