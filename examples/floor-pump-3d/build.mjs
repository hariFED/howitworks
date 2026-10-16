// Builds floor-pump-3d.html: the floor pump of BP-001 as a live 3D technical illustration, driven by
// the 2D sheet's own model (../floor-pump/model.mjs) and profile numbers (../floor-pump/parts.mjs).
//   node examples/floor-pump-3d/build.mjs
//
// One standalone page. three.js r170 comes from jsDelivr through an import map (works from file://);
// everything else is inlined.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineModule, kitPath } from "../../kit/page.mjs";
import * as M from "../floor-pump/model.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pump = join(here, "..", "floor-pump");
export const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// Scene tones per theme, as tokens beside the kit's: lit, mid and shadow faces of uncut surfaces.
// Cut faces use the kit's own --bp-paper and --bp-hatch, the air its --bp-accent.
const css = `
:root, [data-theme="blueprint"] { --bp3-lit: #2a5a93; --bp3-mid: #1d4a7e; --bp3-dark: #133864; }
[data-theme="paper"] { --bp3-lit: #ece6d8; --bp3-mid: #d9d0bc; --bp3-dark: #bdb29b; }
[data-theme="dark"] { --bp3-lit: #353b43; --bp3-mid: #272c32; --bp3-dark: #1b1e22; }
html, body { height: 100%; overflow: hidden; }
.v3 { display: flex; flex-direction: column; height: 100%; }
.v3-bar { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; padding: 8px 16px; font-size: 12px; color: var(--bp-muted); letter-spacing: .03em; border-bottom: 1px solid var(--bp-ui); }
.v3-bar b { color: var(--bp-ink); font-weight: 600; letter-spacing: .08em; }
.v3-grp { display: flex; gap: 4px; align-items: center; }
.v3-bar button { font: inherit; color: var(--bp-muted); background: transparent; border: 1px solid var(--bp-ui); border-radius: 3px; padding: 3px 9px; cursor: pointer; }
.v3-bar button[aria-pressed="true"] { color: var(--bp-ink); background: var(--bp-ui); }
.v3-bar input[type="range"] { width: 92px; accent-color: var(--bp-accent); }
.v3-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; outline: none; background-color: var(--bp-paper);
  background-image: linear-gradient(var(--bp-grid) 1px, transparent 1px), linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px); background-size: 20px 20px; }
.v3-stage:focus-visible { box-shadow: inset 0 0 0 2px var(--bp-accent); }
.v3-stage::after { content: ""; position: absolute; inset: 10px; border: 1.2px solid var(--bp-ink); pointer-events: none; opacity: .85; }
.v3-stage canvas { position: absolute; inset: 0; display: block; touch-action: none; cursor: grab; }
.v3-stage canvas.v3-grab { cursor: grabbing; }
#ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
#ov .thin, #ov .hid { fill: none; stroke: var(--bp-ink); stroke-width: var(--bp-thin); }
#ov .thin { stroke-width: .8px; }
#ov .hid { stroke-width: .8px; stroke-dasharray: 4 2.6; }
#ov .dot, #ov .head { fill: var(--bp-ink); }
#ov .balloon { fill: var(--bp-paper); stroke: var(--bp-ink); stroke-width: .9px; }
#ov .t { font-family: var(--bp-font); font-size: 10.5px; fill: var(--bp-ink); }
.v3-title { position: absolute; right: 10px; bottom: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; width: min(420px, calc(100% - 20px)); border: 1.2px solid var(--bp-ink); border-right: 0; border-bottom: 0; background: var(--bp-paper); font-size: 10px; pointer-events: none; }
.v3-title > div { border-right: .6px solid var(--bp-ink); border-bottom: .6px solid var(--bp-ink); padding: 3px 6px 4px; min-width: 0; }
.v3-title i { display: block; font-style: normal; font-size: 7px; color: var(--bp-muted); letter-spacing: .08em; }
.v3-title .w2 { grid-column: span 2; } .v3-title .w3 { grid-column: span 3; } .v3-title .w4 { grid-column: span 4; }
.v3-title .lg { font-size: 12px; font-weight: 600; letter-spacing: .06em; }
#readout { color: var(--bp-accent-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-hint { position: absolute; left: 22px; bottom: 18px; font-size: 10.5px; color: var(--bp-muted); letter-spacing: .04em; max-width: 46%; pointer-events: none; }
.v3-fail { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; color: var(--bp-muted); }
@media (max-width: 640px) { .v3-hint { display: none; } .v3-title { width: calc(100% - 20px); } .v3-bar { padding: 6px 10px; gap: 6px 10px; } }
`;

const body = `
<div class="v3">
<div class="v3-bar" role="toolbar" aria-label="View controls">
  <b>FLOOR PUMP · BP-001 · 3D</b>
  <span class="v3-grp" role="group" aria-label="View"><button type="button" data-view="iso">ISO</button><button type="button" data-view="front">FRONT</button><button type="button" data-view="side">SIDE</button><button type="button" data-view="top">TOP</button></span>
  <span class="v3-grp"><button type="button" id="cut" aria-pressed="true">CUT</button><label>plane <input id="offset" type="range" min="-30" max="30" step="0.5" value="0" aria-label="Cutting plane offset, mm"></label></span>
  <span class="v3-grp"><label>explode <input id="explode" type="range" min="0" max="1" step="0.01" value="0" aria-label="Explode"></label></span>
  <span class="v3-grp"><button type="button" id="balloons" aria-pressed="true">BALLOONS</button><button type="button" id="pump">PUMP</button></span>
  <span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>
</div>
<div id="stage" class="v3-stage" tabindex="0" role="img" aria-label="Isometric half-section of a bicycle floor pump. Drag to orbit, drag the handle or press Space to pump; the piston, cup seal, check ball and gauge follow the same Boyle's-law model as the 2D sheet.">
  <canvas id="gl"></canvas>
  <svg id="ov" aria-hidden="true"></svg>
  <div class="v3-hint">DRAG TO ORBIT · DRAG THE HANDLE OR SPACE TO PUMP · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · R LET DOWN</div>
  <div class="v3-title">
    <div class="w3 lg"><i>TITLE</i>FLOOR PUMP · ISOMETRIC HALF-SECTION</div><div class="lg"><i>DWG NO</i>BP-001-3D</div>
    <div><i>SCALE</i>NTS</div><div><i>PROJECTION</i>ISOMETRIC</div><div><i>UNITS</i>mm · bar</div><div><i>PARTS</i>21</div>
    <div class="w4"><i>LIVE · SAME MODEL AS BP-001 · DRAG THE HANDLE · SPACE PUMPS</i><span id="readout">&nbsp;</span></div>
  </div>
  <noscript><div class="v3-fail">This drawing needs JavaScript and WebGL.</div></noscript>
</div>
<span id="sr" class="bp-sr" aria-live="polite"></span>
<pre id="bench" hidden></pre>
</div>`;

// If three.js can't load (offline) or WebGL is missing, say so instead of showing an empty sheet.
const guard = `
window.addEventListener("error", (e) => { window.__v3err = String(e.message || e); });
setTimeout(() => {
  if (window.__v3ok) return;
  const d = document.createElement("div");
  d.className = "v3-fail";
  d.id = "v3-fallback";
  d.textContent = "The 3D view could not start (" + (window.__v3err || "three.js did not load: this page needs WebGL and a connection to cdn.jsdelivr.net") + "). The 2D sheet, floor-pump.html, needs neither.";
  document.getElementById("stage").appendChild(d);
}, 8000);`;

const modules = [
  [kitPath("draft.mjs"), "K"],
  [kitPath("live.mjs"), "L"],
  [join(pump, "model.mjs"), "M"],
  [join(pump, "parts.mjs"), "P"],
  [join(here, "geom3d.mjs"), "G"],
]
  .map(([f, n]) => inlineModule(f, n))
  .join("\n");

const html = `<!doctype html>
<html lang="en" data-theme="blueprint">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Floor Pump 3D</title>
<meta name="description" content="The BP-001 floor pump as a live isometric half-section: hatched cut faces, an exploded view with balloons, and the piston, cup seal and check ball driven by the 2D sheet's Boyle's-law model.">
<style>
${readFileSync(kitPath("sheet.css"), "utf8")}
${css}
</style>
<script type="importmap">{ "imports": { "three": "${THREE_URL}" } }</script>
</head>
<body>
${body}
<script>${guard}</script>
<script type="module">
import * as THREE from "three";
${modules}
${readFileSync(join(here, "live3d.js"), "utf8")}
</script>
</body>
</html>
`;
const out = join(here, "floor-pump-3d.html");
writeFileSync(out, html);
console.log(`floor-pump-3d.html  ${(html.length / 1024).toFixed(0)} KB (+ three.module.js r170 from jsDelivr)  swept ${M.SWEPT.toFixed(1)} cm³`);
