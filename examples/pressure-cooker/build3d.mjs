// Builds pressure-cooker-3d.html: the pressure cooker of BP-018 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs), with
// kit/solid3d.mjs.
//   node examples/pressure-cooker/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const size = writePage3d(join(here, "pressure-cooker-3d.html"), {
  title: "Pressure Cooker 3D",
  description: "The BP-018 stovetop pressure cooker as a live isometric half-section: hatched cut faces, bayonet lugs, the weight, the lock pin and the steam, driven by the 2D sheet's saturation model.",
  heading: "PRESSURE COOKER · BP-018 · 3D",
  titleText: "PRESSURE COOKER 6 L · ISOMETRIC HALF-SECTION",
  dwg: "BP-018-3D",
  parts: SC.PARTS,
  units: "mm · bar (gauge)",
  sheet2d: "pressure-cooker.html",
  buttons: `<button type="button" id="hob" aria-pressed="true">HOB</button><button type="button" id="block" aria-pressed="false">BLOCK VENT</button>`,
  hint: "DRAG TO ORBIT · SPACE HOB · DRAG THE WEIGHT OR ↑ ↓ TO VENT · X BLOCKS THE VENT · R REFILLS · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-018 · SPACE HOB · DRAG THE WEIGHT",
  aria: "Isometric half-section of a stovetop pressure cooker. Drag to orbit; Space switches the hob, drag the weight or press the arrow keys to vent by hand. The water, the steam, the lock pin and the weight follow the same saturation model as the 2D sheet.",
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
console.log(`pressure-cooker-3d.html  ${(size / 1024).toFixed(0)} KB  ${SC.PARTS} parts  weight ${M.WEIGHT_G.toFixed(1)} g  (+ three.js from jsDelivr)`);
