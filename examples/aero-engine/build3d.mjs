// Builds aero-engine-3d.html: the flat-four of BP-101 as a live 3D technical illustration, from the 2D
// sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/aero-engine/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "aero-engine-3d.html"), {
  title: "Aero Engine 3D",
  description: "The BP-101 flat-four aircraft engine as a live isometric half-section through all four cylinder axes: hatched cut faces, an exploded view with balloons, and the crank, rods and opposed pistons driven by the 2D sheet's computed cycle, firing 1-3-2-4.",
  heading: "AERO ENGINE · BP-101 · 3D",
  titleText: "FLAT-FOUR AERO ENGINE · ISOMETRIC HALF-SECTION",
  dwg: "BP-101-3D",
  parts: parts.length,
  units: "mm · bar abs · N·m",
  sheet2d: "aero-engine.html",
  buttons: `<button type="button" id="run" aria-pressed="false">RUN</button>`,
  hint: "DRAG TO ORBIT · DRAG THE CRANK OR ← → TO TURN · SPACE RUNS · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · S SLOW",
  live: "LIVE · SAME MODEL AS BP-101 · DRAG THE CRANK · SPACE RUNS",
  aria: "Isometric half-section of a flat-four air-cooled aircraft engine, cut through its crank and all four cylinder axes. Drag to orbit; drag the crank or use the arrow keys to turn it. The opposed pistons, rods and crank follow the same cycle model as the 2D sheet, firing in the order 1-3-2-4.",
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
console.log(`aero-engine-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
