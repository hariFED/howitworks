// Builds nose-gear-3d.html: the nose gear of BP-102 as a live 3D technical illustration, from the 2D
// sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/nose-gear/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[ab]$/, "")));

const size = writePage3d(join(here, "nose-gear-3d.html"), {
  title: "Nose Landing Gear 3D",
  description: "The BP-102 light-aircraft nose gear as a live isometric half-section: the piston tube slides into the cylinder from the sheet's landing model, the metering pin rises through the orifice, the torque links fold, the pedals steer the fork, and on lift-off the centering cams straighten the wheel.",
  heading: "NOSE GEAR · BP-102 · 3D",
  titleText: "OLEO NOSE LANDING GEAR · HALF-SECTION",
  dwg: "BP-102-3D",
  parts: items.size,
  units: "mm · N · bar",
  sheet2d: "nose-gear.html",
  buttons: `<button type="button" id="land">LAND</button><button type="button" id="bump">BUMP</button>`,
  hint: "DRAG TO ORBIT · DRAG THE WHEEL OR ↑ ↓ TO STROKE · ← → PEDALS · SPACE LANDS · B A BUMP · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-102 · DRAG THE WHEEL · ← → PEDALS · SPACE LANDS",
  aria: "Isometric half-section of a light aircraft's steerable oleo-pneumatic nose landing gear. The tour lands on it, steers it with the pedals, rolls over a bump and lifts off: the piston tube slides into the cylinder, the metering pin rises through the orifice, the torque links fold, the fork turns, and the centering cams straighten the wheel when the strut extends. Drag the wheel or use the arrow keys.",
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
console.log(`nose-gear-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
