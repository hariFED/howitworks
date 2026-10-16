// Builds four-stroke-3d.html: the 125 cc single of BP-002 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/four-stroke/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "four-stroke-3d.html"), {
  title: "Four-Stroke 3D",
  description: "The BP-002 125 cc DOHC single as a live isometric half-section through the cylinder and both valve axes: hatched cut faces, an exploded view with balloons, and the crank, rod, piston, cams and valves driven by the 2D sheet's computed cycle, the charge burning from the plug.",
  heading: "FOUR-STROKE · BP-002 · 3D",
  titleText: "125 cc FOUR-STROKE · ISOMETRIC HALF-SECTION",
  dwg: "BP-002-3D",
  parts: parts.length,
  units: "mm · bar abs · °",
  sheet2d: "four-stroke.html",
  buttons: `<button type="button" id="run" aria-pressed="false">RUN</button>`,
  hint: "DRAG TO ORBIT · DRAG THE CRANK OR ← → TO TURN · SPACE RUNS · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS · S SLOW",
  live: "LIVE · SAME MODEL AS BP-002 · DRAG THE CRANK · SPACE RUNS",
  aria: "Isometric half-section of a 125 cc air-cooled DOHC single through its cylinder and valve axes. Drag to orbit; drag the crank or use the arrow keys to turn it. The piston, rod, cams and valves follow the same cycle model as the 2D sheet, and the charge burns from the spark plug.",
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
console.log(`four-stroke-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
