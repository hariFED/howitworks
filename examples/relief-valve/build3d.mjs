// Builds relief-valve-3d.html: the relief valve of BP-011 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/relief-valve/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "relief-valve-3d.html"), {
  title: "Relief Valve 3D",
  description: "The BP-011 DN25 safety relief valve as a live isometric half-section: nozzle, disc and huddling chamber, guide, spindle, spring, bonnet, adjusting screw and lever, popping open, blowing down and reseating on the 2D sheet's own model.",
  heading: "RELIEF VALVE · BP-011 · 3D",
  titleText: "RELIEF VALVE · ISOMETRIC HALF-SECTION",
  dwg: "BP-011-3D",
  parts: parts.length,
  units: "mm · bar (gauge)",
  sheet2d: "relief-valve.html",
  buttons: `<button type="button" id="comp" aria-pressed="true">COMPRESSOR</button>`,
  hint: "DRAG TO ORBIT · DRAG THE BODY OR ↑ ↓ FOR VESSEL PRESSURE · ← → ADJUSTING SCREW · SPACE COMPRESSOR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-011 · DRAG THE BODY · SPACE COMPRESSOR",
  aria: "Isometric half-section of a spring-loaded safety relief valve. Drag to orbit; drag the body or press the arrow keys to change the vessel pressure; the disc pops open, blows down and reseats on the same model as the 2D sheet.",
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
console.log(`relief-valve-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
