// Builds shock-absorber-3d.html: the monotube damper of BP-013 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/shock-absorber/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace("u", "")).filter((id) => /^\d+$/.test(id)));

const size = writePage3d(join(here, "shock-absorber-3d.html"), {
  title: "Monotube Damper 3D",
  description: "The BP-013 monotube gas-charged damper as a live isometric half-section: the rod strokes from the quarter-car model, the shim stacks bend, and the oil runs through the piston ports with its density following its pressure.",
  heading: "MONOTUBE DAMPER · BP-013 · 3D",
  titleText: "MONOTUBE DAMPER · HALF-SECTION",
  dwg: "BP-013-3D",
  parts: items.size,
  units: "mm · bar abs",
  sheet2d: "shock-absorber.html",
  buttons: `<button type="button" id="hump">HUMP</button><button type="button" id="damp" aria-pressed="true">DAMPING</button>`,
  hint: "DRAG TO ORBIT · DRAG THE ROD OR ↑ ↓ TO STROKE · SPACE A HUMP · D DAMPING · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME QUARTER-CAR MODEL AS BP-013 · DRAG THE ROD · SPACE: A HUMP · D: DAMPING",
  aria: "Isometric half-section of a monotube gas-charged shock absorber. A quarter car drives it over a speed hump: the rod strokes, the shim stacks on the piston bend, the oil flows through the open port and its density follows its pressure, and the floating piston moves on the nitrogen. Drag the rod or use the arrow keys to stroke it by hand; Space drives over a hump, D switches the damping off.",
  css: `#ov .flow{fill:none;stroke:var(--bp-accent-ink);stroke-width:2px;stroke-dasharray:5 3.5;stroke-linejoin:round}#ov .flow-head{fill:var(--bp-accent-ink)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`shock-absorber-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
